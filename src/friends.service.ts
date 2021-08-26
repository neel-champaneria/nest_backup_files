import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { MailService } from './../mail/mail.service';
import { User } from './../users/user.model';
import { Friend } from './friend.model';

@Injectable()
export class FriendsService {
  constructor(
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(Friend) private friendModel: typeof Friend,
    private mailService: MailService,
  ) {}

  async makeFriend(user, friend) {
    const utoi = await user.$add('friend', await friend);
    const itou = (await friend).$add('friend', await user);

    if (utoi && itou) {
      return true;
    }
  }

  async inviteFriend(userEmailId, inviteEmailId) {
    // Check whether user and invitedUser in database
    const user = await this.userModel.findOne({
      where: { email: userEmailId },
    });

    const invitedUser = await this.userModel.findOne({
      where: { email: inviteEmailId },
    });

    if (invitedUser) {
      // if invitedEmailId present in DB
      // check whether user and invitedUser are alredy friends
      const alreadyFriend = await user.$has('friend', invitedUser);

      if (alreadyFriend) {
        // user and invitedUser are alreday friends
        return {
          message: `You are alreday friend with ${invitedUser.email}`,
        };
      } else {
        // user and invitedUser are not friend
        // Check whether invitedUser.isRegistered is true or false
        if (!invitedUser.isRegistered) {
          // if isRegistered is false, then send invite and make friend
          const mailSend = await this.mailService.sendInviteMail(
            inviteEmailId,
            await user.username,
          );

          const makeFriendBool = this.makeFriend(user, invitedUser);

          // const utoi = await user.$add('friend', await invitedUser);
          // const itou = (await invitedUser).$add('friend', await user);

          if (mailSend && this.makeFriend) {
            return { message: 'invitation is sent' };
          }
        } else {
          // if isRegistered is true, then make friends
          const makeFriendBool = this.makeFriend(user, invitedUser);
          if (makeFriendBool) {
            return { message: 'You are Friends now' };
          }
        }
      }
    } else {
      // invitedEmailId not present in DB then send email, and make friends

      const mailSend = await this.mailService.sendInviteMail(
        inviteEmailId,
        await user.username,
      );

      const createInvitedUser = this.userModel.create({
        email: inviteEmailId,
      });
      const createInvitedUserPromise = (await createInvitedUser).save();

      // const utoi = await user.$add('friend', await createInvitedUserPromise);
      // const itou = (await createInvitedUserPromise).$add('friend', await user);

      // if ((await mailSend) && (await utoi) && (await itou)) {
      //   return { message: 'invitation is sent' };
      // }
      const makeFriendBool = this.makeFriend(user, invitedUser);
      if (mailSend && makeFriendBool) {
        return { message: 'invitation is sent' };
      }
    }
  }

  async editInviteFriend(userEmailId, oldInvitedEmailId, newInvitedEmailId) {
    const user = await this.userModel.findOne({
      where: { email: userEmailId },
    });
    const oldInvitedUser = await this.userModel.findOne({
      where: { email: oldInvitedEmailId },
    });
    const newInvitedUser = await this.userModel.findOne({
      where: { email: newInvitedEmailId },
    });

    // Check whether oldInvitedUser.isRegister is true or false
    if (!oldInvitedUser.isRegistered) {
      const count = await oldInvitedUser.$count('friend');
      if (count === 1) {
        if (!newInvitedUser) {
          oldInvitedUser.email = newInvitedEmailId;
          const updateEmail = await oldInvitedUser.save();
          const mailSend = await this.mailService.sendInviteMail(
            newInvitedEmailId,
            await user.username,
          );

          if ((await updateEmail) && (await mailSend)) {
            return {
              message: `Invite Email Id is updated, and new invitation mail is sent to ${newInvitedEmailId}`,
            };
          }
        } else {
          const otou = await oldInvitedUser.$remove('friend', await user, {
            force: true,
          });
          const utoo = await user.$remove('friend', await oldInvitedUser, {
            force: true,
          });
          const destroyOld = (await oldInvitedUser).destroy({ force: true });
          //   const ntou = (await user).$add('friend', await newInvitedUser);
          //   const uton = (await newInvitedUser).$add('friend', await user);
          //   if (otou && utoo && ntou && uton) {
          //     return {
          //       message: `Invite Email Id is Updated, and you are friend with ${newInvitedEmailId}.`,
          //     };
          //   }
          if (otou && utoo) {
            return this.inviteFriend(userEmailId, newInvitedEmailId);
          }
        }
      } else if (count > 1) {
        const otou = await oldInvitedUser.$remove('friend', await user, {
          force: true,
        });
        const utoo = await user.$remove('friend', await oldInvitedUser, {
          force: true,
        });
        // if (!newInvitedUser) {
        //   return this.inviteFriend(userEmailId, newInvitedEmailId);
        // } else {
        //   const ntou = (await user).$add('friend', await newInvitedUser);
        //   const uton = (await newInvitedUser).$add('friend', await user);
        //   if (ntou && uton) {
        //     return {
        //       message: `Invite Email Id is Updated, and you are friend with ${newInvitedEmailId}.`,
        //     };
        //   }
        // }
        return this.inviteFriend(userEmailId, newInvitedEmailId);
      }
    }
  }

  async removeFriendFromList(userEmail, friendEmail) {
    const userAccount = await this.userModel.findOne({
      where: { email: userEmail },
    });
    const friendAccount = await this.userModel.findOne({
      where: { email: friendEmail },
    });

    const count = await friendAccount.$count('friend');

    const uToF = await userAccount.$remove('friend', friendAccount, {
      force: true,
    });
    const fToU = await friendAccount.$remove('friend', userAccount, {
      force: true,
    });

    if (count === 1 && friendAccount.isRegistered === false) {
      await friendAccount.destroy({ force: true });
    }
    if (uToF && fToU) {
      return {
        message: `${friendEmail} removed from friend list successfully.`,
      };
    }
  }

  async listFriends(userId) {
    const user = await this.userModel.findOne({
      where: { id: userId },
      include: ['friend'],
    });

    return user;
  }
}
