import { Controller, Get } from '@nestjs/common';
import { ProfilesService, type ProfileDto } from './profiles.service.js';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  findAll(): Promise<ProfileDto[]> {
    return this.profilesService.findAll();
  }
}
