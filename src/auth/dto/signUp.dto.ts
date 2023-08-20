import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from "class-validator";

export class SignUpDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(25)
  @Matches(/^[a-zA-Z]/, { message: 'Username must start with a letter' })
  username: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(25)
  password: string;
}