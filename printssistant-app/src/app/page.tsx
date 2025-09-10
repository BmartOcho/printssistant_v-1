import SpecParser from './components/SpecParser';

export default function Home() {
  return (
    <main className="min-h-screen py-12">
      <div className="container mx-auto">
        <h1 className="text-4xl font-bold text-center mb-12">
          PrintPrep AI Assistant
        </h1>
        <SpecParser />
      </div>
    </main>
  );
}