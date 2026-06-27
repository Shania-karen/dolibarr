import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SidebarLayout from './components/layouts/SidebarLayout';
import ProtectedRoute from './components/layouts/ProtectedRoute';
import ResetForm from './pages/backOffice/ResetForm';
import Home from './pages/backOffice/Home';
import ImportPage from './pages/backOffice/Import';

function App() {
return (
    <BrowserRouter>
      <Routes>
        <Route element={<SidebarLayout />}>
          <Route index element={<Home />} />
          <Route path="backoffice" element={<ProtectedRoute><ResetForm /></ProtectedRoute>} />
          <Route path="backoffice/import" element={<ProtectedRoute><ImportPage /></ProtectedRoute>} />
          {/* <Route path="conges" element={<TicketCreate />} />
          <Route path="entrepots" element={<AssetList />} />
          <Route path="noteFrais" element=< */}
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
export default App
