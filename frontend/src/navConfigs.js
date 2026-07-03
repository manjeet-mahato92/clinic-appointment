export const superAdminNav = [
  { to: '/super-admin', label: 'Overview', icon: '◆', end: true },
  { to: '/super-admin/hospitals', label: 'Hospitals', icon: '⛨' },
  { to: '/super-admin/banners', label: 'Banner Ads', icon: '▤' },
];

export const hospitalNav = [
  { to: '/hospital', label: 'Today’s Tokens', icon: '◆', end: true },
  { to: '/hospital/insights', label: 'Insights', icon: '📈' },
  { to: '/hospital/doctors', label: 'Doctors', icon: '⚕' },
  { to: '/hospital/patients', label: 'Patients', icon: '☺' },
  { to: '/hospital/profile', label: 'Clinic Profile', icon: '⛨' },
];

export const doctorNav = [
  { to: '/doctor', label: 'Today’s Queue', icon: '◆', end: true },
  { to: '/doctor/profile', label: 'My Profile', icon: '⚙' },
];

export const displayNav = [
  { to: '/display/select-doctor', label: 'Select Doctor', icon: '◆', end: true },
];
