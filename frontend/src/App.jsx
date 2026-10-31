import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import AppLayout from './components/layout/AppLayout.jsx';

// Προσωρινά placeholders για να επιβεβαιώσουμε τη ροή
const Dashboard = () => <div className="text-xl font-bold">Επισκόπηση (Dashboard)</div>;
const FieldsPage = () => <div className="text-xl font-bold">Χωράφια & Χάρτης</div>;
const CropsPage = () => <div className="text-xl font-bold">Καλλιέργειες & Εργασίες</div>;
const DispatchesPage = () => <div className="text-xl font-bold">Δελτία Αποστολής</div>;
const SettlementsPage = () => <div className="text-xl font-bold">Εκκαθαρίσεις</div>;
const FinancesPage = () => <div className="text-xl font-bold">Οικονομικά & Έξοδα</div>;
import Login from './pages/Login';

function ProtectedRoute({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="fields" element={<FieldsPage />} />
            <Route path="crops" element={<CropsPage />} />
            <Route path="dispatches" element={<DispatchesPage />} />
            <Route path="settlements" element={<SettlementsPage />} />
            <Route path="finances" element={<FinancesPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}