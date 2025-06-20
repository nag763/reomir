import LoadingScreen from '@/components/LoadingScreen'; // Adjust path if needed

export const metadata = {
  title: 'Booting...',
};

// This is the loading screen component that will be displayed during the initial loading phase of the app.
export default function Loading() {
  return <LoadingScreen />;
}
