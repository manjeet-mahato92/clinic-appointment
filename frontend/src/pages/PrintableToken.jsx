import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/client.js';

export default function PrintableToken() {
  const { appointmentId } = useParams();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/hospital/appointments/${appointmentId}`)
      .then(r => {
        setAppointment(r.data);
        setTimeout(() => window.print(), 500); // Allow time for render
      })
      .catch(err => setError(err.response?.data?.error || 'Could not load appointment details.'))
      .finally(() => setLoading(false));
  }, [appointmentId]);

  if (loading) {
    return <div className="p-10 text-center">Loading token...</div>;
  }

  if (error) {
    return <div className="p-10 text-center text-red-600">{error}</div>;
  }

  if (!appointment) return null;

  const displayUrl = `${window.location.origin}/display/board/${appointment.doctor_id}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(displayUrl)}`;

  return (
    <div className="p-6" style={{ width: '288px', fontFamily: 'sans-serif' }}>
      <div className="text-center border-b-2 border-dashed border-black pb-3">
        <h1 className="text-lg font-bold">{appointment.hospital_name}</h1>
        <p className="text-xs">{appointment.hospital_address}</p>
      </div>
      <div className="flex items-center justify-between py-4">
        <div className="text-center">
          <div className="text-xs uppercase tracking-wider">Token No.</div>
          <div className="text-7xl font-bold">{appointment.token_number}</div>
        </div>
        <div className="text-center">
          <img src={qrCodeUrl} alt="QR Code for live queue status" className="mx-auto" />
          <p className="text-xs mt-1">Scan for live status</p>
        </div>
      </div>
      <div className="border-t-2 border-dashed border-black pt-3 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="font-semibold">Patient:</span>
          <span>{appointment.patient_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Doctor:</span>
          <span>{appointment.doctor_name}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Room No:</span>
          <span>{appointment.room_number || 'N/A'}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Timeslot:</span>
          <span>{appointment.timeslot}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Date:</span>
          <span>{new Date(appointment.appointment_date + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        </div>
      </div>
    </div>
  );
}