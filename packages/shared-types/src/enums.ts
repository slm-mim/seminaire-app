export enum UserRole {
  ADMIN = 'ADMIN',
  ORGANIZER = 'ORGANIZER',
  MODERATOR = 'MODERATOR',
}

export enum SeminarStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  CLOSED = 'CLOSED',
  COMPLETED = 'COMPLETED',
}

export enum RegistrationStatus {
  REGISTERED = 'REGISTERED',
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
}

export enum QASessionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum QuestionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ANSWERED = 'ANSWERED',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
}

export enum ContactSource {
  BREVO_SYNC = 'BREVO_SYNC',
  MANUAL = 'MANUAL',
  REGISTRATION = 'REGISTRATION',
}

export enum EmailTemplateType {
  INVITATION = 'INVITATION',
  REMINDER = 'REMINDER',
  POST_EVENT = 'POST_EVENT',
}

export enum CampaignType {
  INVITATION = 'INVITATION',
  AUTO_REMINDER = 'AUTO_REMINDER',
  MANUAL_REMINDER = 'MANUAL_REMINDER',
  POST_EVENT = 'POST_EVENT',
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  SCHEDULED = 'SCHEDULED',
}

export enum RecipientTarget {
  ALL_CONTACTS = 'ALL_CONTACTS',
  ALL_REGISTERED = 'ALL_REGISTERED',
  PRESENT_ONLY = 'PRESENT_ONLY',
}

export enum DriveSyncType {
  PRESENTATION = 'PRESENTATION',
  RESOURCE = 'RESOURCE',
  ATTENDANCE_LIST = 'ATTENDANCE_LIST',
}
