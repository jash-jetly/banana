import HostView from './components/HostView';
import ClientView from './components/ClientView';

function App() {
  const params = new URLSearchParams(window.location.search);
  const isClient = params.get('mode') === 'client';
  const urlCode = params.get('code');

  if (isClient) {
    return <ClientView initialCode={urlCode} />;
  }

  return <HostView />;
}

export default App;
