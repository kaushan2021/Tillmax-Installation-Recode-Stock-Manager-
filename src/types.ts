export type UserRole = 'ADMIN' | 'EMPLOYEE';

export interface Business {
  id?: string;
  name: string;
  name_lowercase?: string;
  ownerName: string;
  telephone: string;
  contactNumber: string;
  email: string;
  address: string;
  postcode: string;
  postcode_lowercase?: string;
  postcode_normalized?: string;
  createdAt: string;
}

export interface Equipment {
  name: string;
  quantity: number;
}

export interface InstallationRecord {
  id?: string;
  businessId: string;
  supportType: 'Online and telephone support' | 'Return to base' | 'On site';
  supportStatus: string;
  supportStartDate: string;
  supportEndDate: string;
  installationDate: string;
  equipment: Equipment[];
  paymentAmount: number;
  vatStatus?: 'Inc VAT' | 'No VAT';
  paymentStatus: 'Payment cleared' | 'Payment due';
  paymentDueAmount: number;
  salesPerson: string;
  engineer: string;
  softwareType: string;
  licenseNumbers: string[];
  teamViewerIds: string[];
  invoiceNumber: string;
  invoiceNumber_lowercase?: string;
  businessName?: string;
  businessName_lowercase?: string;
  postcode?: string;
  postcode_lowercase?: string;
  postcode_normalized?: string;
  comments: string;
  updatedAt?: any;
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

export interface Category {
  id?: string;
  name: string;
}

export interface Supplier {
  id?: string;
  name: string;
  email: string;
  contactNumber: string;
  address: string;
}

export interface EquipmentType {
  id?: string;
  name: string;
  categoryId?: string;
  supplierId?: string;
  currentStock: number;
  lowStockThreshold: number;
}

export type StockMovementType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface StockMovement {
  id?: string;
  equipmentTypeId: string;
  equipmentTypeName: string;
  type: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  reason: string;
  userId: string;
  username: string;
  timestamp: string;
}

export interface EmailTemplate {
  id?: string;
  name: string;
  subject: string;
  body: string;
  logo?: string;
  footerImage?: string;
  createdAt: string;
}

export interface SystemSetting {
  id?: string;
  gmailUser: string;
  gmailAppPassword: string;
  senderName: string;
  updatedAt: string;
}
