import {
  BadRequestException,
  Body,
  Controller,
  InternalServerErrorException,
  Post,
  Req,
  Res,
  UnauthorizedException
} from '@nestjs/common';
import { Response } from 'express';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private usersService: UsersService,
    private authService: AuthService
  ) {}

  @Public()
  @Post('sign-up')
  async signUp(@Body() signUpDto) {
    try {
      const { username, password } = signUpDto;
      const user = await this.usersService.findByUsername(username);
      if (user) {
        throw new BadRequestException('User already exists');
      }
      await this.usersService.create({ username, password });
      return 'User created';
    } catch (error) {
      throw new InternalServerErrorException('database error');
    }
  }

  @Public()
  @Post('sign-in')
  async signIn(@Body() signInDto, @Res() res: Response) {
    try {
      const { username, password } = signInDto;
      const { access_token, refresh_token } = await this.authService.signIn(username, password);
      // We're setting the cookie with the refresh token here
      res.cookie('refreshToken', refresh_token, { httpOnly: true });
      return { access_token };
    } catch (error) {
      throw new UnauthorizedException('Username or password incorrect');
    }
  }

  @Public()
  @Post('refresh')
  async refresh(@Req() req) {
    const refreshToken = req.cookies['refreshToken'];

    if (!refreshToken) {
      throw new UnauthorizedException();
    }

    try {
      return await this.authService.refresh(refreshToken);
    } catch {
      throw new UnauthorizedException();
    }
  }
}
