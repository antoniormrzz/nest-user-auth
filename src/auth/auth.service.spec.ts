import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: {
            findByUsername: jest.fn(),
          },
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
  });

  describe('signIn', () => {
    it('should throw an error if the password does not match', async () => {
      const username = 'testuser';
      const password = 'testpassword';
      const salt = await bcrypt.genSalt();
      const user = {
        id: 1,
        username,
        password: await bcrypt.hash(password, salt),
      };
      jest.spyOn(usersService, 'findByUsername').mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(authService.signIn(username, password)).rejects.toThrowError();
    });

    it('should return an access token and a refresh token if the password matches', async () => {
      const username = 'testuser';
      const password = 'testpassword';
      const user = {
        id: 1,
        username,
        password: await bcrypt.hash(password, 10),
      };
      const payload = { sub: user.id, username: user.username };
      const accessToken = 'access_token';
      const refreshToken = 'refresh_token';
      jest.spyOn(usersService, 'findByUsername').mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce(accessToken);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce(refreshToken);

      const result = await authService.signIn(username, password);

      expect(result).toEqual({ access_token: accessToken, refresh_token: refreshToken });
      expect(jwtService.signAsync).toHaveBeenCalledWith(payload);
      expect(jwtService.signAsync).toHaveBeenCalledWith(payload, { expiresIn: '7d' });
    });
  });

  describe('refresh', () => {
    it('should throw an UnauthorizedException if the refresh token is invalid', async () => {
      const refreshToken = 'invalid_token';
      jest.spyOn(jwtService, 'verifyAsync').mockRejectedValueOnce(new Error());

      await expect(authService.refresh(refreshToken)).rejects.toThrowError();
    });

    it('should return a new access token if the refresh token is valid', async () => {
      const refreshToken = 'valid_token';
      const payload = { sub: 1, username: 'testuser' };
      const accessToken = 'new_access_token';
      jest.spyOn(jwtService, 'verifyAsync').mockResolvedValueOnce(payload);
      jest.spyOn(jwtService, 'signAsync').mockResolvedValueOnce(accessToken);

      const result = await authService.refresh(refreshToken);

      expect(result).toEqual({ access_token: accessToken });
      expect(jwtService.verifyAsync).toHaveBeenCalledWith(refreshToken);
      expect(jwtService.signAsync).toHaveBeenCalledWith(payload);
    });
  });
});
