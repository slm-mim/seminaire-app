import {
  SeminarStatus,
  RegistrationStatus,
  QASessionStatus,
  QuestionStatus,
  Gender,
  ContactSource,
  UserRole,
} from './enums';

export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  createdAt: string;
}

export interface SeminarDto {
  id: string;
  title: string;
  description: string;
  speaker: string;
  price: number;
  date: string;
  location: string;
  image: string | null;
  registrationDeadline: number;
  reminderDays: number;
  status: SeminarStatus;
  driveFolder: string | null;
  createdAt: string;
}

export interface ContactDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  city: string;
  phone: string | null;
  source: ContactSource;
  createdAt: string;
}

export interface RegistrationDto {
  id: string;
  seminarId: string;
  contactId: string;
  status: RegistrationStatus;
  isWalkIn: boolean;
  registeredAt: string;
  contact: ContactDto;
}

export interface QASessionDto {
  id: string;
  seminarId: string | null;
  title: string;
  status: QASessionStatus;
  qrCodeUrl: string;
  createdAt: string;
}

export interface QuestionDto {
  id: string;
  sessionId: string;
  authorName: string | null;
  gender: Gender;
  content: string;
  status: QuestionStatus;
  order: number;
  submittedAt: string;
}
