#!/usr/bin/env python3
"""
PII Scrubber

Enhancements:
- Better full-name detection (text and XML) with conservative heuristics
- Address detection (street lines) in text
- XML tag-aware scrubbing for Name, Address lines, City, State, and ZIP
- Preserve-format support for new data types (name, address, city, state)
- Consistent replacement caching when use_hash=True

Usage (CLI):
  python scrubber.py INPUT OUTPUT -t xml
  python scrubber.py INPUT OUTPUT -t auto --preserve-format --use-hash
  python scrubber.py INPUT_DIR OUTPUT_DIR -b --pattern "*.xml"

Notes:
- XML scrubbing is tag-aware and also runs generic pattern scrubbing on all text nodes.
- If your XML uses namespaces, local tag names are normalized automatically.
"""

from __future__ import annotations

import argparse
import random
import re
import string
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import xml.etree.ElementTree as ET
from xml.etree.ElementTree import Element


# -------------------------------
# Placeholders
# -------------------------------
PLACEHOLDER_EMAIL = "[EMAIL_REMOVED]"
PLACEHOLDER_PHONE = "[PHONE_REMOVED]"
PLACEHOLDER_SSN = "[SSN_REMOVED]"
PLACEHOLDER_CC = "[CC_REMOVED]"
PLACEHOLDER_IP = "[IP_REMOVED]"
PLACEHOLDER_DOB = "[DOB_REMOVED]"
PLACEHOLDER_ZIP = "[ZIP_REMOVED]"
PLACEHOLDER_NAME = "[NAME_REMOVED]"
PLACEHOLDER_ADDRESS = "[ADDRESS_REMOVED]"
PLACEHOLDER_CITY = "[CITY_REMOVED]"
PLACEHOLDER_STATE = "[STATE_REMOVED]"

# -------------------------------
# Helper utilities
# -------------------------------
def _norm_tag(tag: str) -> str:
    """Strip namespace and lowercase tag name."""
    if "}" in tag:
        tag = tag.split("}", 1)[1]
    return tag.lower()


def _is_placeholder(value: Optional[str]) -> bool:
    if not value:
        return False
    v = value.strip()
    return v.endswith("_REMOVED]") or v in {
        PLACEHOLDER_EMAIL,
        PLACEHOLDER_PHONE,
        PLACEHOLDER_SSN,
        PLACEHOLDER_CC,
        PLACEHOLDER_IP,
        PLACEHOLDER_DOB,
        PLACEHOLDER_ZIP,
        PLACEHOLDER_NAME,
        PLACEHOLDER_ADDRESS,
        PLACEHOLDER_CITY,
        PLACEHOLDER_STATE,
    }


def _word_like_name(token: str) -> bool:
    # A simple heuristic to generate capitalized name-like tokens when preserving format
    return token and token[0].isupper()


def _capitalize_like(token_len: int) -> str:
    # Generate a capitalized token similar to a name (length-aware)
    length = max(2, min(12, token_len))
    return random.choice(string.ascii_uppercase) + "".join(
        random.choices(string.ascii_lowercase, k=length - 1)
    )


def _pick_state_abbr() -> str:
    # US State abbreviations (includes DC)
    return random.choice(
        [
            "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA",
            "HI","ID","IL","IN","IA","KS","KY","LA","ME","MD",
            "MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
            "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC",
            "SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"
        ]
    )


class DataScrubber:
    """
    PII Scrubber for text, XML, and email-like content.
    """

    # Address and person-related XML tags (normalized, no namespaces)
    PERSON_NAME_TAGS = {
        "name",
        "full_name",
        "fullname",
        "first_name",
        "firstname",
        "middle_name",
        "middlename",
        "last_name",
        "lastname",
        "surname",
        "givenname",
        "contactname",
        "accountmanager",
        "approver",
        "operator",
        "user",
        "staff",
    }

    ADDRESS_LINE_TAGS = {
        "address",
        "address1",
        "address2",
        "address3",
        "addressline1",
        "addressline2",
        "addressline3",
        "line1",
        "line2",
        "line3",
        "street",
        "street1",
        "street2",
        "streetaddress",
        "addr1",
        "addr2",
        "addr3",
        "shipto",
        "billto",
    }

    CITY_TAGS = {"city", "town", "locality"}
    STATE_TAGS = {"state", "province", "region", "stateid", "statecode", "stateabbr"}
    ZIP_TAGS = {"postcode", "zip", "zipcode", "postalcode"}

    # Name indicators for light-weight scrubbing in sentences
    DEFAULT_NAME_INDICATORS = [
        "Name:",
        "Contact:",
        "Customer:",
        "Attn",
        "ATTN",
        "Prepared by:",
        "Account Manager:",
        "Manager:",
        "Applicant:",
        "Approver:",
        "By:",
    ]

    def __init__(self, preserve_format: bool = False, use_hash: bool = False, seed: Optional[int] = None):
        self.preserve_format = preserve_format
        self.use_hash = use_hash
        self.replacement_cache: Dict[str, str] = {}
        self.name_indicators = list(self.DEFAULT_NAME_INDICATORS)

        # Optionally seed randomness for reproducible pseudonyms/formats
        if seed is not None:
            random.seed(seed)

        # Compiled regex patterns (conservative where possible)
        # Order matters when applied: longer/more specific first if overlapping
        self.patterns: Dict[str, re.Pattern] = {
            # Emails
            "email": re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b"),
            # US phones: (123) 456-7890, 123-456-7890, 123.456.7890, 123 456 7890
            "phone_us": re.compile(
                r"(?:\+1[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}\b"
            ),
            # Intl phones: +44 20 7123 1234, +49-30-123456
            "phone_intl": re.compile(
                r"\+\d{1,3}[\s.-]?(?:\(?\d{1,4}\)?[\s.-]?){1,5}\d{3,}\b"
            ),
            # SSN
            "ssn": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
            # Credit card: common 13-19 digits with separators; basic Luhn not checked here
            "credit_card": re.compile(
                r"\b(?:\d[ -]*?){13,19}\b"
            ),
            # IPv4
            "ip_address": re.compile(
                r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\.){3}"
                r"(?:25[0-5]|2[0-4]\d|[01]?\d?\d)\b"
            ),
            # DOB-ish dates (MM/DD/YYYY or YYYY-MM-DD) – heuristic
            "date_of_birth": re.compile(
                r"\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}/\d{1,2}/\d{4})\b"
            ),
            # ZIP / Postal code (US) – also DOE's ZIP+4
            "zip_code": re.compile(r"\b\d{5}(?:-\d{4})?\b"),
            # Street address heuristic: number + street + suffix
            "street_address": re.compile(
                r"\b\d{1,6}\s+(?:[A-Za-z0-9#.\-]+\s+){0,5}"
                r"(?:Street|St|Road|Rd|Avenue|Ave|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Terrace|Ter|Place|Pl|Parkway|Pkwy|Circle|Cir)\.?\b",
                re.IGNORECASE,
            ),
            # Full name heuristic: two or three capitalized tokens (John A. Smith, John Smith)
            # Avoid matching ALLCAPS or trailing punctuation
            "full_name": re.compile(
                r"\b([A-Z][a-z]{1,}(?:[-'][A-Z][a-z]{1,})?"
                r"(?:\s+[A-Z][a-z]{1,}\.?)?"
                r"(?:\s+[A-Z][a-z]{1,}(?:[-'][A-Z][a-z]{1,})?))\b"
            ),
            # "City: X" / "State: YY" labeled forms in text
            "labeled_city": re.compile(r"\b(City|Town|Locality)\s*:\s*([A-Za-z .'-]{2,})\b", re.IGNORECASE),
            "labeled_state": re.compile(r"\b(State|Province|Region)\s*:\s*([A-Za-z]{2,}|[A-Za-z .'-]{2,})\b", re.IGNORECASE),
        }

    # -------------------------------
    # Replacement generation
    # -------------------------------
    def _generate_replacement(self, data_type: str, original: str) -> str:
        """
        Generate replacement text for a given data type. Respects preserve_format and use_hash flags.
        """
        if self.use_hash and original in self.replacement_cache:
            return self.replacement_cache[original]

        replacement: str

        if data_type == "email":
            if self.preserve_format:
                local = "".join(random.choices(string.ascii_lowercase, k=8))
                replacement = f"{local}@example.com"
            else:
                replacement = PLACEHOLDER_EMAIL

        elif data_type == "phone_us" or data_type == "phone_intl":
            if self.preserve_format:
                replacement = f"555-{random.randint(100,999)}-{random.randint(1000,9999)}"
            else:
                replacement = PLACEHOLDER_PHONE

        elif data_type == "ssn":
            if self.preserve_format:
                replacement = f"{random.randint(100,999)}-{random.randint(10,99)}-{random.randint(1000,9999)}"
            else:
                replacement = PLACEHOLDER_SSN

        elif data_type == "credit_card":
            if self.preserve_format:
                replacement = f"{random.randint(1000,9999)}-XXXX-XXXX-{random.randint(1000,9999)}"
            else:
                replacement = PLACEHOLDER_CC

        elif data_type == "ip_address":
            if self.preserve_format:
                replacement = f"192.168.{random.randint(0,255)}.{random.randint(1,255)}"
            else:
                replacement = PLACEHOLDER_IP

        elif data_type == "date_of_birth":
            if self.preserve_format:
                replacement = f"01/01/{random.randint(1950,2000)}"
            else:
                replacement = PLACEHOLDER_DOB

        elif data_type == "zip_code":
            if self.preserve_format:
                replacement = "00000"
            else:
                replacement = PLACEHOLDER_ZIP

        elif data_type in ("full_name", "name"):
            if self.preserve_format:
                # Try to preserve word count and capitalization pattern
                words = [w for w in re.split(r"(\s+)", original) if w]
                new_words: List[str] = []
                for w in words:
                    if w.strip() == "":
                        new_words.append(w)
                    elif w.isalpha() and _word_like_name(w):
                        new_words.append(_capitalize_like(len(w)))
                    else:
                        # Keep delimiters or non-alpha as-is
                        if w.strip().isalpha():
                            new_words.append(_capitalize_like(len(w)))
                        else:
                            new_words.append(w)
                replacement = "".join(new_words).strip()
                if not replacement or replacement == original:
                    replacement = "John Doe"
            else:
                replacement = PLACEHOLDER_NAME

        elif data_type in ("address", "street_address"):
            if self.preserve_format:
                replacement = f"{random.randint(1,9999)} Example St"
            else:
                replacement = PLACEHOLDER_ADDRESS

        elif data_type == "city":
            if self.preserve_format:
                replacement = "Anytown"
            else:
                replacement = PLACEHOLDER_CITY

        elif data_type == "state":
            if self.preserve_format:
                # If looks like 2-letter code, pick random state abbr; else generic "CA"
                if re.fullmatch(r"[A-Za-z]{2}", original.strip()):
                    replacement = _pick_state_abbr()
                else:
                    replacement = "California"
            else:
                replacement = PLACEHOLDER_STATE

        else:
            replacement = "[DATA_REMOVED]"

        if self.use_hash:
            self.replacement_cache[original] = replacement

        return replacement

    # -------------------------------
    # Text scrubbing
    # -------------------------------
    def scrub_text(self, text: str, custom_patterns: Optional[Dict[str, str]] = None) -> str:
        """
        Scrub personal data from plain text.

        Args:
            text: The text to scrub
            custom_patterns: Additional regex patterns to search for

        Returns:
            Scrubbed text
        """
        if not text:
            return text

        scrubbed = text
        patterns_to_use: Dict[str, re.Pattern] = dict(self.patterns)

        if custom_patterns:
            # Allow external callers to augment patterns on the fly
            for k, v in custom_patterns.items():
                patterns_to_use[k] = re.compile(v)

        # Run pattern-based replacements
        for data_type, pattern in patterns_to_use.items():
            # Only replace data types that our generator understands
            if data_type not in {
                "email",
                "phone_us",
                "phone_intl",
                "ssn",
                "credit_card",
                "ip_address",
                "date_of_birth",
                "zip_code",
                "street_address",
                "full_name",
                "labeled_city",
                "labeled_state",
            }:
                continue

            matches = list(pattern.finditer(scrubbed))
            # Replace from the end to keep indices intact
            for match in reversed(matches):
                original = match.group(0)
                if _is_placeholder(original):
                    continue

                if data_type == "labeled_city":
                    label = match.group(1)
                    replacement_value = self._generate_replacement("city", match.group(2))
                    replacement_text = f"{label}: {replacement_value}"
                elif data_type == "labeled_state":
                    label = match.group(1)
                    replacement_value = self._generate_replacement("state", match.group(2))
                    replacement_text = f"{label}: {replacement_value}"
                elif data_type == "full_name":
                    replacement_text = self._generate_replacement("full_name", original)
                elif data_type == "street_address":
                    replacement_text = self._generate_replacement("address", original)
                else:
                    replacement_text = self._generate_replacement(data_type, original)

                scrubbed = scrubbed[: match.start()] + replacement_text + scrubbed[match.end() :]

        # Additional indicator-based name scrubbing (conservative)
        scrubbed = self._scrub_names(scrubbed)

        return scrubbed

    def _scrub_names(self, text: str) -> str:
        """Basic indicator-based name scrubbing: e.g., 'Contact: John Smith'."""
        if not text:
            return text

        result = text
        for indicator in self.name_indicators:
            # Indicator followed by one or more capitalized words
            pattern = re.compile(
                f"{re.escape(indicator)}\\s+([A-Z][a-z]+(?:\\s+[A-Z][a-z]+){{0,2}})"
            )
            result = pattern.sub(f"{indicator} {PLACEHOLDER_NAME}", result)
        return result

    # -------------------------------
    # XML scrubbing
    # -------------------------------
    def scrub_xml(self, xml_content: str, sensitive_tags: Optional[List[str]] = None) -> str:
        """
        Scrub personal data from XML content.

        Args:
            xml_content: XML string to scrub
            sensitive_tags: Backwards-compatible list of XML tag name substrings that suggest sensitive data

        Returns:
            Scrubbed XML string
        """
        try:
            root = ET.fromstring(xml_content)
        except ET.ParseError as e:
            print(f"Error parsing XML: {e}")
            return xml_content

        # Default sensitive tags, used as substring matches for attributes or legacy schemas
        if sensitive_tags is None:
            sensitive_tags = [
                "email",
                "phone",
                "ssn",
                "address",
                "name",
                "customer_email",
                "user_email",
                "contact",
                "personal_info",
                "credit_card",
                "city",
                "state",
                "postal",
                "zip",
            ]

        self._scrub_xml_element(root, sensitive_tags, ancestors=[])
        return ET.tostring(root, encoding="unicode")

    def _scrub_xml_element(self, element: Element, sensitive_tags: List[str], ancestors: List[str]):
        """Recursively scrub XML elements with tag-aware logic and pattern scrubbing."""
        tag = _norm_tag(element.tag)
        new_ancestors = ancestors + [tag]

        # Decide if this element is explicitly PII by tag semantics
        is_name_tag = tag in self.PERSON_NAME_TAGS
        is_addr_tag = tag in self.ADDRESS_LINE_TAGS
        is_city_tag = tag in self.CITY_TAGS
        is_state_tag = tag in self.STATE_TAGS
        is_zip_tag = tag in self.ZIP_TAGS

        # If this is a <name> inside an address context, treat it as address (e.g., Address->Name)
        in_address_context = any(a in self.ADDRESS_LINE_TAGS or a == "address" for a in ancestors)
        if tag == "name" and in_address_context:
            is_addr_tag = True
            is_name_tag = False

        # Scrub by tag first (entire value), then run generic pattern scrub
        if element.text:
            if is_addr_tag:
                if not _is_placeholder(element.text):
                    element.text = self._generate_replacement("address", element.text)
            elif is_city_tag:
                if not _is_placeholder(element.text):
                    element.text = self._generate_replacement("city", element.text)
            elif is_state_tag:
                if not _is_placeholder(element.text):
                    element.text = self._generate_replacement("state", element.text)
            elif is_zip_tag:
                if not _is_placeholder(element.text):
                    element.text = self._generate_replacement("zip_code", element.text)
            elif is_name_tag:
                if not _is_placeholder(element.text):
                    element.text = self._generate_replacement("name", element.text)

            # Regardless of tag semantics, also scrub patterns in free text
            if element.text:
                element.text = self.scrub_text(element.text)

        # Scrub attributes: if attribute name suggests PII, replace entirely; else scrub patterns
        for attr_name, attr_value in list(element.attrib.items()):
            attr_name_l = attr_name.lower()
            attr_sensitive = any(st in attr_name_l for st in sensitive_tags)

            # Tag-aware attribute replacement
            if any(k in attr_name_l for k in ("address", "street", "addr", "line1", "line2")):
                element.attrib[attr_name] = self._generate_replacement("address", attr_value)
            elif any(k in attr_name_l for k in ("city", "town", "locality")):
                element.attrib[attr_name] = self._generate_replacement("city", attr_value)
            elif any(k in attr_name_l for k in ("state", "province", "region")):
                element.attrib[attr_name] = self._generate_replacement("state", attr_value)
            elif any(k in attr_name_l for k in ("zip", "postal", "postcode")):
                element.attrib[attr_name] = self._generate_replacement("zip_code", attr_value)
            elif any(k in attr_name_l for k in ("name", "fullname", "firstname", "lastname", "surname")):
                element.attrib[attr_name] = self._generate_replacement("name", attr_value)
            elif attr_sensitive:
                # Fallback: if attribute looks sensitive, remove
                element.attrib[attr_name] = "[REMOVED]"
            else:
                # Otherwise, scrub patterns within attribute value
                element.attrib[attr_name] = self.scrub_text(attr_value)

        # Recurse into children
        for child in element:
            self._scrub_xml_element(child, sensitive_tags, new_ancestors)
            if child.tail:
                child.tail = self.scrub_text(child.tail)

    # -------------------------------
    # Email scrubbing
    # -------------------------------
    def scrub_email_content(self, email_text: str) -> str:
        """
        Scrub personal data from email content

        Args:
            email_text: Email content (headers and body)

        Returns:
            Scrubbed email content
        """
        lines = email_text.split("\n")
        scrubbed_lines: List[str] = []

        # Email header fields that typically contain personal data
        sensitive_headers = [
            "From:",
            "To:",
            "Cc:",
            "Bcc:",
            "Reply-To:",
            "Return-Path:",
            "X-Original-Sender:",
        ]

        for line in lines:
            is_sensitive_header = any(line.startswith(header) for header in sensitive_headers)

            if is_sensitive_header:
                if ":" in line:
                    header, value = line.split(":", 1)
                    scrubbed_value = self.scrub_text(value)
                    scrubbed_lines.append(f"{header}:{scrubbed_value}")
                else:
                    scrubbed_lines.append(line)
            else:
                scrubbed_lines.append(self.scrub_text(line))

        return "\n".join(scrubbed_lines)

    # -------------------------------
    # File and batch utilities
    # -------------------------------
    def scrub_file(self, input_path: str, output_path: str, file_type: str = "auto"):
        """
        Scrub a file and save the result

        Args:
            input_path: Path to input file
            output_path: Path to output file
            file_type: Type of file ('xml', 'email', 'text', or 'auto' to detect)
        """
        input_file = Path(input_path)

        if not input_file.exists():
            raise FileNotFoundError(f"Input file not found: {input_path}")

        with open(input_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Auto-detect file type if needed
        if file_type == "auto":
            if input_file.suffix.lower() == ".xml":
                file_type = "xml"
            elif input_file.suffix.lower() in [".eml", ".msg"]:
                file_type = "email"
            else:
                file_type = "text"

        # Scrub based on file type
        if file_type == "xml":
            scrubbed_content = self.scrub_xml(content)
        elif file_type == "email":
            scrubbed_content = self.scrub_email_content(content)
        else:
            scrubbed_content = self.scrub_text(content)

        # Save scrubbed content
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(scrubbed_content)

        print(f"Scrubbed file saved to: {output_path}")

    def batch_scrub(self, input_dir: str, output_dir: str, file_pattern: str = "*"):
        """
        Scrub multiple files in a directory

        Args:
            input_dir: Input directory path
            output_dir: Output directory path
            file_pattern: File pattern to match (e.g., '*.xml')
        """
        input_path = Path(input_dir)
        output_path = Path(output_dir)

        if not input_path.exists():
            raise FileNotFoundError(f"Input directory not found: {input_dir}")

        output_path.mkdir(parents=True, exist_ok=True)

        files = list(input_path.glob(file_pattern))

        for file in files:
            output_file = output_path / f"scrubbed_{file.name}"
            try:
                self.scrub_file(str(file), str(output_file))
                print(f"Processed: {file.name}")
            except Exception as e:
                print(f"Error processing {file.name}: {e}")


def main():
    """Command-line interface for the data scrubber"""
    parser = argparse.ArgumentParser(description="Scrub personal data from XML and email files")
    parser.add_argument("input", help="Input file or directory path")
    parser.add_argument("output", help="Output file or directory path")
    parser.add_argument(
        "-t", "--type", choices=["xml", "email", "text", "auto"], default="auto", help="Type of file to process"
    )
    parser.add_argument("-b", "--batch", action="store_true", help="Process multiple files in a directory")
    parser.add_argument("-p", "--pattern", default="*", help='File pattern for batch processing (e.g., "*.xml")')
    parser.add_argument("--preserve-format", action="store_true", help="Preserve data format in replacements")
    parser.add_argument("--use-hash", action="store_true", help="Use consistent caching for replacements within a run")
    parser.add_argument("--seed", type=int, default=None, help="Optional random seed for reproducible outputs")

    args = parser.parse_args()

    # Create scrubber instance
    scrubber = DataScrubber(preserve_format=args.preserve_format, use_hash=args.use_hash, seed=args.seed)

    # Process files
    if args.batch:
        scrubber.batch_scrub(args.input, args.output, args.pattern)
    else:
        scrubber.scrub_file(args.input, args.output, args.type)

    print("Scrubbing complete!")


# Example usage when run directly
if __name__ == "__main__":
    # Check if command-line arguments were provided
    import sys
    
    if len(sys.argv) > 1:
        # Run CLI interface
        main()
    else:
        # Run example demonstrations
        print("=" * 60)
        print("PII SCRUBBER EXAMPLES")
        print("=" * 60)
        
        # Example 1: Basic text scrubbing
        scrubber = DataScrubber(preserve_format=True)
        
        sample_text = """
        Customer John Smith (email: john.smith@email.com) called from 555-123-4567.
        His SSN is 123-45-6789 and credit card 1234-5678-9012-3456.
        IP address logged: 192.168.1.100
        Address: 123 Main Street, Anytown, CA 90210
        """
        
        print("\n--- Example 1: Text Scrubbing ---")
        print("Original text:")
        print(sample_text)
        print("\nScrubbed text:")
        print(scrubber.scrub_text(sample_text))
        
        # Example 2: XML scrubbing with tag awareness
        sample_xml = """<?xml version="1.0"?>
        <customer>
            <name>Jane Doe</name>
            <email>jane.doe@example.com</email>
            <phone>+1-555-987-6543</phone>
            <ssn>987-65-4321</ssn>
            <address>
                <line1>456 Oak Avenue</line1>
                <city>Springfield</city>
                <state>IL</state>
                <zip>62701</zip>
            </address>
        </customer>
        """
        
        print("\n--- Example 2: XML Scrubbing ---")
        print("Original XML:")
        print(sample_xml)
        print("\nScrubbed XML:")
        print(scrubber.scrub_xml(sample_xml))
        
        # Example 3: Email scrubbing
        sample_email = """From: sender@example.com
To: recipient@company.com
Subject: Account Information
Date: Mon, 1 Jan 2024 10:00:00 -0500

Dear John Smith,

Your account (john.smith@email.com) has been updated.
Please contact us at 555-123-4567 if you have questions.

Best regards,
Support Team
"""
        
        print("\n--- Example 3: Email Scrubbing ---")
        print("Original email:")
        print(sample_email)
        print("\nScrubbed email:")
        print(scrubber.scrub_email_content(sample_email))
        
        print("\n" + "=" * 60)
        print("To use the CLI, run:")
        print("  python scrubber.py input.txt output.txt")
        print("  python scrubber.py input_dir/ output_dir/ -b --pattern '*.xml'")
        print("=" * 60)