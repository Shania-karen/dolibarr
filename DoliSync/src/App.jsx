import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SidebarLayout from './components/layouts/SidebarLayout';
import ProtectedRoute from './components/layouts/ProtectedRoute';
import ResetForm from './pages/backOffice/ResetForm';
import Dashboard from './pages/backOffice/Dashboard';
import Home from './pages/backOffice/Home';
import ImportPage from './pages/backOffice/Import';
import ListSalaires from './pages/frontOffice/salaires/ListSalaires';
import CreateSalaire from './pages/frontOffice/salaires/CreateSalaire';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SidebarLayout />}>
          <Route index element={<Home />} />
          <Route path="backoffice" element={<ProtectedRoute><ResetForm /></ProtectedRoute>} />
          <Route path="backoffice/import" element={<ProtectedRoute><ImportPage /></ProtectedRoute>} />
          <Route path="backoffice/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="salaires" element={<ListSalaires />} />
          <Route path="salaires/nouveau" element={<CreateSalaire />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
export default App
