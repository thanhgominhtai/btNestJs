import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CustomJwtAuthGuard } from '../common/guards/custom-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, Role } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { UserPayload } from '../common/decorators/current-user.decorator';
import { ParseObjectIdPipe } from '../common/pipes/parse-object-id.pipe';

@Controller('orders')
@UseGuards(CustomJwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @CurrentUser() user: UserPayload,
    @Body() createOrderDto: CreateOrderDto,
  ) {
    return this.ordersService.create(
      user.userId,
      user.name || 'Khách hàng',
      user.email,
      user.role,
      createOrderDto,
    );
  }

  @Get('my-orders')
  findMyOrders(@CurrentUser('userId') userId: string) {
    return this.ordersService.findMyOrders(userId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('userId') userId: string,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.update(id, userId, updateOrderDto);
  }

  @Delete(':id/cancel')
  @HttpCode(HttpStatus.OK)
  cancel(
    @Param('id', ParseObjectIdPipe) id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.ordersService.cancel(id, userId);
  }

  @Get('admin/all')
  @Roles(Role.ADMIN)
  adminFindAll(
    @Query('status') status?: string,
    @Query('keyword') keyword?: string,
  ) {
    return this.ordersService.adminFindAll(status, keyword);
  }

  @Patch('admin/:id/status')
  @Roles(Role.ADMIN)
  adminUpdateStatus(
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.adminUpdateStatus(id, dto);
  }
}
