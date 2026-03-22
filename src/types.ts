export type UserRole = 'ADMIN' | 'EMPLOYEE';

export interface Business {
  id?: string;
  name: string;
  ownerName: string;
  telephone: string;
  contactNumber: string;
  email: string;
  address: string;
  postcode: string;
  createdAt: string;
}

export interface Equipment {
  name: string;
  quantity: number;
}

export interface InstructionRecord {
  id?: string;
  businessId: string;
  supportType: 'Online and telephone support' | 'Return to base' | 'On site';
  supportStatus: string;
  supportStartDate: string;
  supportEndDate: string;
  installationDate: string;
  equipment: Equipment[];
  paymentAmount: number;
  paymentStatus: 'Payment cleared' | 'Payment due';
  paymentDueAmount: number;
  salesPerson: string;
  engineer: string;
  softwareType: string;
  licenseNumbers: string[];
  teamViewerIds: string[];
  invoiceNumber: string;
  comments: string;
  renewalInformed?: boolean;
  renewalInformedMethod?: 'Email' | 'Text' | 'Other';
  renewalInformedDate?: string;
  createdAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  role: UserRole;
  createdAt: string;
}

export interface LogEntry {
  id?: string;
  userId: string;
  username: string;
  action: string;
  timestamp: string;
}

export interface SimpleEntity {
  id?: string;
  name: string;
}
