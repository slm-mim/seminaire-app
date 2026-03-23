import { LoginInput } from 'validation';

export class LoginDto implements LoginInput {
  email: string;
  password: string;
}
