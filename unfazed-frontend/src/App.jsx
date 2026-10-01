import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ClientAuthProvider } from './context/ClientAuthContext';
import AppRoutes from './routes/AppRoutes';
import UpgradeModal from './components/common/UpgradeModal';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ClientAuthProvider>
          <AppRoutes />
          <UpgradeModal />
        </ClientAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
