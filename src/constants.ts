import { RequestStatus } from './types';

export const APP_VER = '1.0.0';

export const SK = {
  data: 'cctv_oef25_data_v1',
  users: 'cctv_oef25_users_v1',
  set: 'cctv_oef25_settings_v1',
  ses: 'cctv_oef25_session',
};

export const PURPOSES: readonly string[] = [
  'Security Investigation',
  'Safety Investigation',
  'Property Damage',
  'HR Investigation',
  'Audit',
  'Legal Requirement',
  'Other (Please Specify)',
];

export const FOOTAGE: readonly string[] = [
  'Image',
  'Video',
  'Other (Please Specify)',
];

export const MEDIA: readonly string[] = ['E-mail', 'Other'];

export const STATUS: readonly RequestStatus[] = [
  'Submitted',
  'Under Review',
  'Approved',
  'Released',
  'Rejected',
];

export const STEPS: Record<RequestStatus, string> = {
  Submitted: 'Request received',
  'Under Review': 'Security checking footage',
  Approved: 'Approver signed off',
  Released: 'Footage handed over',
  Rejected: 'Request declined',
};
