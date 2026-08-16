import { Controller, Get, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { CustomJwtAuthGuard } from '../common/guards/custom-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, Role } from '../common/decorators/roles.decorator';

@Controller('stats')
@UseGuards(CustomJwtAuthGuard, RolesGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('dashboard')
  @Roles(Role.ADMIN)
  getDashboardStats() {
    return this.statsService.getDashboardStats();
  }
}
