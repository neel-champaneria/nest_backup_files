import { getModelToken } from '@nestjs/sequelize';
import { Test, TestingModule } from '@nestjs/testing';
import { FriendsService } from './friends.service';
import { User } from './../users/user.model';
import { Friend } from './friend.model';
import { MailService } from './../mail/mail.service';

describe('FriendsService', () => {
  let service: FriendsService;

  let dto = {
    id: Date.now(),
    username: '',
    email: '',
    password: '',
    isRegistered: true,
    $add: jest.fn().mockImplementation(() => true),
  };

  let mockUserModel = {
    findOne: jest.fn().mockImplementation((userEmailId) => {
      return Promise.resolve({});
    }),
    create: jest.fn(),
  };
  let mockFriendModel = {};
  let mockMailService = {
    sendInviteMail: jest.fn().mockImplementation(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FriendsService,
        { provide: getModelToken(User), useValue: mockUserModel },
        { provide: getModelToken(Friend), useValue: mockFriendModel },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<FriendsService>(FriendsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return you are already friend', async () => {
    mockUserModel.findOne = jest.fn().mockImplementation((wholeObj) => {
      /* 
        Here u1@gmail.com and u2@gmail.com are alreday in database with isRegistered to true.
        And u1@gail.com is alreday friend with u2@gmail.com.
      */
      const { where } = wholeObj;
      if (where.email === 'u1@gmail.com') {
        dto.username = where.email;
        dto.password = where.email;
        dto.email = where.email;
        return Promise.resolve({
          ...dto,
          $has: jest.fn().mockImplementation(() => true),
        });
      }
      if (where.email === 'u2@gmail.com') {
        dto.username = where.email;
        dto.password = where.email;
        dto.email = where.email;
        return Promise.resolve({
          ...dto,
          $has: jest.fn().mockImplementation(() => true),
        });
      }
    });

    expect(await service.inviteFriend('u1@gmail.com', 'u2@gmail.com')).toEqual({
      message: `You are alreday friend with u2@gmail.com`,
    });
  });

  it('should return `invitation is sent`', async () => {
    /* 
      Here u1@gmail.com in database with isRegistered flag to true,
      u2@gmail.com in database with isRegistered flag to false,
      So new invitation mail will be sent to u2@gmail.com and u1 and u2 will become friend
    */
    mockUserModel.findOne = jest.fn().mockImplementation((wholeObj) => {
      const { where } = wholeObj;
      if (where.email === 'u1@gmail.com') {
        dto.username = where.email;
        dto.password = where.email;
        dto.email = where.email;
        dto.isRegistered = true;
        return Promise.resolve({
          ...dto,
          $has: jest.fn().mockImplementation(() => false),
        });
      }
      if (where.email === 'u2@gmail.com') {
        dto.username = where.email;
        dto.password = where.email;
        dto.email = where.email;
        dto.isRegistered = false;
        return Promise.resolve({
          ...dto,
          $has: jest.fn().mockImplementation(() => false),
        });
      }
    });

    expect(await service.inviteFriend('u1@gmail.com', 'u2@gmail.com')).toEqual({
      message: `invitation is sent`,
    });
  });

  it('should return `You are Friends now`', async () => {
    /* 
      Here u1@gmail.com and u2@gmail.com alreday in database with isRegister to true,
      and u1@gmail.com is inviting u2@gmail.com
    */
    mockUserModel.findOne = jest.fn().mockImplementation((wholeObj) => {
      const { where } = wholeObj;
      if (where.email === 'u1@gmail.com') {
        dto.username = where.email;
        dto.password = where.email;
        dto.email = where.email;
        dto.isRegistered = true;
        return Promise.resolve({
          ...dto,
          $has: jest.fn().mockImplementation(() => false),
        });
      }
      if (where.email === 'u2@gmail.com') {
        dto.username = where.email;
        dto.password = where.email;
        dto.email = where.email;
        dto.isRegistered = true;
        return Promise.resolve({
          ...dto,
          $has: jest.fn().mockImplementation(() => false),
        });
      }
    });

    expect(await service.inviteFriend('u1@gmail.com', 'u2@gmail.com')).toEqual({
      message: `You are Friends now`,
    });
  });

  it('should return `invitation is sent`', async () => {
    /* 
      Invited email does not exist in database. Here u1@gmail.com invites u2@gmail.com
    */
    mockUserModel.findOne = jest.fn().mockImplementation((wholeObj) => {
      // {where: {email: ""}}
      const { where } = wholeObj;
      if (where.email === 'u1@gmail.com') {
        dto.username = where.email;
        dto.password = where.email;
        dto.email = where.email;
        dto.isRegistered = true;
        return Promise.resolve({
          ...dto,
          $has: jest.fn().mockImplementation(() => false),
        });
      }
      if (where.email === 'u2@gmail.com') {
        return undefined;
      }
    });

    mockUserModel.create = jest.fn().mockImplementation((wholeObj) => {
      const { email } = wholeObj;
      console.log(email);
      dto.username = email;
      dto.password = email;
      dto.email = email;
      dto.isRegistered = false;
      return Promise.resolve({
        ...dto,
        save: jest.fn().mockImplementation(() => {
          return Promise.resolve({
            ...dto,
            $has: jest.fn().mockImplementation(() => false),
            $add: jest.fn().mockImplementation(() => true),
          });
        }),
      });
    });

    expect(await service.inviteFriend('u1@gmail.com', 'u2@gmail.com')).toEqual({
      message: `invitation is sent`,
    });
  });

  it('should change wrong email to new email and return `Invite Email Id is updated, and new invitation mail is sent to u3@gmail.com`', async () => {
    /* 
      Here user with user@gmail.com by mistake invite oldInvite@gmail.com  instead of newInvite@gmail.com.
      oldInvite@gmail.com entry is added to friend table as "user@gmail.com is friend of oldInvite@gmail.com".
      As oldInvite@gmail.com has only one friend and we alreday know it is wrongly inputed.
      We change the email id in the row of oldInvite@gmail.com with newInvite@gmail.com
    */
    mockUserModel.findOne = jest.fn().mockImplementation((wholeObj) => {
      const { where } = wholeObj;
      if (where.email === 'user@gmail.com') {
        dto.username = where.email;
        dto.password = where.email;
        dto.email = where.email;
        dto.isRegistered = true;
        return Promise.resolve({
          ...dto,
          $has: jest.fn().mockImplementation(() => false),
        });
      }
      if (where.email === 'oldInvite@gmail.com') {
        dto.username = where.email;
        dto.password = where.email;
        dto.email = where.email;
        dto.isRegistered = false;
        return Promise.resolve({
          ...dto,
          $has: jest.fn().mockImplementation(() => false),
          $count: jest.fn().mockImplementation(() => 1),
          save: jest.fn().mockImplementation(() => {
            return Promise.resolve({
              ...dto,
              $has: jest.fn().mockImplementation(() => false),
              $add: jest.fn().mockImplementation(() => true),
              $count: jest.fn().mockImplementation(() => 1),
            });
          }),
        });
      }
      if (where.email === 'newInvite@gmail.com') {
        return undefined;
      }
    });

    expect(
      await service.editInviteFriend(
        'user@gmail.com',
        'oldInvite@gmail.com',
        'newInvite@gmail.com',
      ),
    ).toEqual({
      message: `Invite Email Id is updated, and new invitation mail is sent to newInvite@gmail.com`,
    });
  });

  it('should remove friend from friend list and return `friend@gmail.com removed from friend list successfully.`', async () => {
    mockUserModel.findOne = jest.fn().mockImplementation((wholeObj) => {
      const { where } = wholeObj;
      if (where.email === 'user@gmail.com') {
        dto.username = where.email;
        dto.password = where.email;
        dto.email = where.email;
        dto.isRegistered = true;
        return Promise.resolve({
          ...dto,
          $remove: jest.fn().mockImplementation(() => true),
          destroy: jest.fn().mockImplementation(() => true),
        });
      }
      if (where.email === 'friend@gmail.com') {
        dto.username = where.email;
        dto.password = where.email;
        dto.email = where.email;
        dto.isRegistered = false;
        return Promise.resolve({
          ...dto,
          $remove: jest.fn().mockImplementation(() => true),
          $count: jest.fn().mockImplementation(() => 1),
          destroy: jest.fn().mockImplementation(() => true),
        });
      }
    });

    expect(
      await service.removeFriendFromList('user@gmail.com', 'friend@gmail.com'),
    ).toEqual({
      message: 'friend@gmail.com removed from friend list successfully.',
    });
  });
});
