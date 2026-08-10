import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ProfilesService, type ProfileDto } from './profiles.service.js';

@Controller('profiles')
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  findAll(): Promise<ProfileDto[]> {
    return this.profilesService.findAll();
  }

  @Post()
  create(@Body('name') name: unknown): Promise<ProfileDto> {
    return this.profilesService.create(name);
  }

  @Put(':profileId/pokemon')
  replaceTeam(
    @Param('profileId') profileId: string,
    @Body() pokemonIds: unknown
  ): Promise<ProfileDto> {
    return this.profilesService.replaceTeam(profileId, pokemonIds);
  }
}
