import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { BadRequestException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { SignUpDto } from './dto/signUp.dto';
import { SignInDto } from './dto/signIn.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let usersService: UsersService;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: UsersService,
          useValue: {
            findByUsername: jest.fn(),
            create: jest.fn(),
          },
        },
        {
          provide: AuthService,
          useValue: {
            signIn: jest.fn(),
            refresh: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    usersService = module.get<UsersService>(UsersService);
    authService = module.get<AuthService>(AuthService);
  });

  describe('signUp', () => {
    it('should create a new user', async () => {
      const signUpDto: SignUpDto = {
        username: 'testuser',
        password: 'testpassword',
      };
      jest.spyOn(usersService, 'findByUsername').mockResolvedValueOnce(null);
      jest.spyOn(usersService, 'create').mockResolvedValueOnce(undefined);

      const result = await controller.signUp(signUpDto);

      expect(usersService.findByUsername).toHaveBeenCalledWith(signUpDto.username);
      expect(usersService.create).toHaveBeenCalledWith(signUpDto);
      expect(result).toEqual('User created');
    });

    it('should throw BadRequestException if user already exists', async () => {
      const signUpDto: SignUpDto = {
        username: 'testuser',
        password: 'testpassword',
      };
      jest.spyOn(usersService, 'findByUsername').mockResolvedValueOnce({
        ...signUpDto,
        id: 1,
      });
        

      await expect(controller.signUp(signUpDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw InternalServerErrorException if there is a database error', async () => {
      const signUpDto: SignUpDto = {
        username: 'testuser',
        password: 'testpassword',
      };
      jest.spyOn(usersService, 'findByUsername').mockRejectedValueOnce(new Error());

      await expect(controller.signUp(signUpDto)).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('signIn', () => {
    it('should sign in a user and return access token', async () => {
      const signInDto: SignInDto = {
        username: 'testuser',
        password: 'testpassword',
      };
      const access_token = 'test_access_token';
      const refresh_token = 'test_refresh_token';
      jest.spyOn(authService, 'signIn').mockResolvedValueOnce({ access_token, refresh_token });
      const res = {
        cookie: jest.fn(),
      };

      const result = await controller.signIn(signInDto, res as any);

      expect(authService.signIn).toHaveBeenCalledWith(signInDto.username, signInDto.password);
      expect(res.cookie).toHaveBeenCalledWith('refresh_token', refresh_token, { httpOnly: true });
      expect(result).toEqual({ access_token });
    });

    it('should throw UnauthorizedException if username or password is incorrect', async () => {
      const signInDto: SignInDto = {
        username: 'testuser',
        password: 'testpassword',
      };
      jest.spyOn(authService, 'signIn').mockRejectedValueOnce(new Error());

      await expect(controller.signIn(signInDto, {} as any)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should refresh access token', async () => {
      const refresh_token = 'test_refresh_token';
      const access_token = 'test_access_token';
      jest.spyOn(authService, 'refresh').mockResolvedValueOnce({ access_token });
      const req = {
        cookies: {
          refresh_token,
        },
      };

      const result = await controller.refresh(req as any);

      expect(authService.refresh).toHaveBeenCalledWith(refresh_token);
      expect(result).toEqual({ access_token });
    });

    it('should throw UnauthorizedException if refresh token is not provided', async () => {
      const req = {
        cookies: {},
      };

      await expect(controller.refresh(req as any)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if there is an error refreshing token', async () => {
      const refreshToken = 'test_refresh_token';
      jest.spyOn(authService, 'refresh').mockRejectedValueOnce(new Error());
      const req = {
        cookies: {
          refreshToken,
        },
      };

      await expect(controller.refresh(req as any)).rejects.toThrow(UnauthorizedException);
    });
  });
});