import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import SuperAdminEditHospital from './pages/SuperAdminEditHospital.jsx';
import SuperAdminDoctors from './pages/SuperAdminDoctors.jsx';
import SuperAdminPatients from './pages/SuperAdminPatients.jsx';
import SuperAdminSubscriptions from './pages/SuperAdminSubscriptions.jsx';

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
import HospitalBilling from './pages/HospitalBilling.jsx';
import HospitalProfile from './pages/HospitalProfile.jsx';
import HospitalDoctorQueue from './pages/HospitalDoctorQueue.jsx';

import DoctorQueue from './pages/DoctorQueue.jsx';
import DoctorProfile from './pages/DoctorProfile.jsx';

import DisplaySelectDoctor from './pages/DisplaySelectDoctor.jsx';
import DisplayBoard from './pages/DisplayBoard.jsx';
import DisplayBoardAll from './pages/DisplayBoardAll.jsx';
import SuperAdminLogin from './pages/SuperAdminLogin.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/book" element={<PatientBooking />} />
      <Route path="/super-admin/login" element={<SuperAdminLogin />} />

      <Route path="/super-admin" element={<ProtectedRoute role="super_admin"><SuperAdminOverview /></ProtectedRoute>} />
      <Route path="/super-admin/hospitals" element={<ProtectedRoute role="super_admin"><SuperAdminHospitals /></ProtectedRoute>} />
      <Route path="/super-admin/hospitals/:hospitalId/edit" element={<ProtectedRoute role="super_admin"><SuperAdminEditHospital /></ProtectedRoute>} />
      <Route path="/super-admin/doctors" element={<ProtectedRoute role="super_admin"><SuperAdminDoctors /></ProtectedRoute>} />
      <Route path="/super-admin/patients" element={<ProtectedRoute role="super_admin"><SuperAdminPatients /></ProtectedRoute>} />
      <Route path="/super-admin/subscriptions" element={<ProtectedRoute role="super_admin"><SuperAdminSubscriptions /></ProtectedRoute>} />
      <Route path="/super-admin/hospitals/:hospitalId/doctors" element={<ProtectedRoute role="super_admin"><HospitalDoctors /></ProtectedRoute>} />
      <Route path="/super-admin/hospitals/:hospitalId/patients" element={<ProtectedRoute role="super_admin"><HospitalPatients /></ProtectedRoute>} />
      <Route path="/super-admin/banners" element={<ProtectedRoute role="super_admin"><SuperAdminBanners /></ProtectedRoute>} />

      <Route path="/hospital" element={<ProtectedRoute role="hospital"><HospitalAppointments /></ProtectedRoute>} />
      <Route path="/hospital/insights" element={<ProtectedRoute role="hospital"><HospitalInsights /></ProtectedRoute>} />
      <Route path="/hospital/doctors" element={<ProtectedRoute role="hospital"><HospitalDoctors /></ProtectedRoute>} />
      <Route path="/hospital/doctor/:doctorId/queue" element={<ProtectedRoute role="hospital"><HospitalDoctorQueue /></ProtectedRoute>} />
      <Route path="/hospital/patients" element={<ProtectedRoute role="hospital"><HospitalPatients /></ProtectedRoute>} />
      <Route path="/hospital/profile" element={<ProtectedRoute role="hospital"><HospitalProfile /></ProtectedRoute>} />
      <Route path="/hospital/billing" element={<ProtectedRoute role="hospital"><HospitalBilling /></ProtectedRoute>} />

      <Route path="/doctor" element={<ProtectedRoute role="doctor"><DoctorQueue /></ProtectedRoute>} />
      <Route path="/doctor/profile" element={<ProtectedRoute role="doctor"><DoctorProfile /></ProtectedRoute>} />

      <Route path="/display/select-doctor" element={<ProtectedRoute role={["hospital", "display"]}><DisplaySelectDoctor /></ProtectedRoute>} />
      <Route path="/display/board-all" element={<ProtectedRoute role={["hospital", "display"]}><DisplayBoardAll /></ProtectedRoute>} />
      <Route path="/display/board/:doctorId" element={<ProtectedRoute role={["hospital", "display"]}><DisplayBoard /></ProtectedRoute>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
