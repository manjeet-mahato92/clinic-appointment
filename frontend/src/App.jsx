import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';

import Login from './pages/Login.jsx';
import PatientBooking from './pages/PatientBooking.jsx';
import NotFound from './pages/NotFound.jsx';

import SuperAdminOverview from './pages/SuperAdminOverview.jsx';
import SuperAdminHospitals from './pages/SuperAdminHospitals.jsx';
import SuperAdminBanners from './pages/SuperAdminBanners.jsx';

import HospitalAppointments from './pages/HospitalAppointments.jsx';
import HospitalInsights from './pages/HospitalInsights.jsx';
import HospitalDoctors from './pages/HospitalDoctors.jsx';
import HospitalPatients from './pages/HospitalPatients.jsx';
import HospitalProfile from './pages/HospitalProfile.jsx';
import HospitalDoctorQueue from './pages/HospitalDoctorQueue.jsx';

import DoctorQueue from './pages/DoctorQueue.jsx';
import DoctorProfile from './pages/DoctorProfile.jsx';

import DisplaySelectDoctor from './pages/DisplaySelectDoctor.jsx';
import DisplayBoard from './pages/DisplayBoard.jsx';
import SuperAdminLogin from './pages/SuperAdminLogin.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/book" element={<PatientBooking />} />

      <Route path="/super-admin" element={<ProtectedRoute role="super_admin"><SuperAdminOverview /></ProtectedRoute>} />
      <Route path="/super-admin/hospitals" element={<ProtectedRoute role="super_admin"><SuperAdminHospitals /></ProtectedRoute>} />
      <Route path="/super-admin/banners" element={<ProtectedRoute role="super_admin"><SuperAdminBanners /></ProtectedRoute>} />

      <Route path="/hospital" element={<ProtectedRoute role="hospital"><HospitalAppointments /></ProtectedRoute>} />
      <Route path="/hospital/insights" element={<ProtectedRoute role="hospital"><HospitalInsights /></ProtectedRoute>} />
      <Route path="/hospital/doctors" element={<ProtectedRoute role="hospital"><HospitalDoctors /></ProtectedRoute>} />
      <Route path="/hospital/doctor/:doctorId/queue" element={<ProtectedRoute role="hospital"><HospitalDoctorQueue /></ProtectedRoute>} />
      <Route path="/hospital/patients" element={<ProtectedRoute role="hospital"><HospitalPatients /></ProtectedRoute>} />
      <Route path="/hospital/profile" element={<ProtectedRoute role="hospital"><HospitalProfile /></ProtectedRoute>} />

      <Route path="/doctor" element={<ProtectedRoute role="doctor"><DoctorQueue /></ProtectedRoute>} />
      <Route path="/doctor/profile" element={<ProtectedRoute role="doctor"><DoctorProfile /></ProtectedRoute>} />

      <Route path="/display/select-doctor" element={<ProtectedRoute role={["hospital", "display"]}><DisplaySelectDoctor /></ProtectedRoute>} />
      <Route path="/display/board/:doctorId" element={<ProtectedRoute role={["hospital", "display"]}><DisplayBoard /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
