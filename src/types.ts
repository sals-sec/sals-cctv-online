export type RequestStatus = 'Submitted' | 'Under Review' | 'Approved' | 'Rejected';

export type UserRole = 'admin' | 'full' | 'limited';

export interface UserAccount {
  u: string;
  salt: string;
  h: string;
  role: UserRole;
  by?: string;
}

export interface CctvRequest {
  id: string;
  no: string;
  status: RequestStatus;
  reqDate: string;
  reqTime: string;
  name: string;
  empId: string;
  dept: string;
  pos: string;
  contact: string;
  email: string;
  purposes: string[];
  purposeOther: string;
  area: string;
  recDate: string;
  recFrom: string;
  recTo: string;
  footage: string[];
  footageOther: string;
  media: string[];
  mediaOther: string;
  ack: boolean;
  sigName: string;
  sigDate: string;
  recvBy: string;
  recvDate: string;
  revBy: string;
  avail: 'Yes' | 'No' | '';
  quality: 'Good' | 'Fair' | 'Poor' | '';
  apprName: string;
  apprDate: string;
  remarks: string;
  by: string;
  created: string;
  updated: string;
  _new?: boolean;
}

export interface AppSettings {
  dark: boolean;
  officer: string;
}

export type TabType = 'form' | 'reg';

export type DateFilterType = 'all' | 'today' | 'week' | 'month';
