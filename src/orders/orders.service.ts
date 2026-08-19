import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from './entities/order.entity';
import { Recipe, RecipeDocument } from '../recipes/entities/recipe.entity';
import { RealtimeService } from '../realtime/realtime.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Recipe.name) private readonly recipeModel: Model<RecipeDocument>,
    private readonly realtimeService: RealtimeService,
  ) {}

  async create(
    userId: string,
    userName: string,
    userEmail: string,
    userRole: string,
    dto: CreateOrderDto,
  ) {
    // Admin is prohibited from placing orders
    if (userRole === 'ADMIN') {
      throw new ForbiddenException('Tài khoản Quản trị viên không thể thực hiện đặt món.');
    }

    if (!Types.ObjectId.isValid(dto.recipeId)) {
      throw new BadRequestException('Món ăn không hợp lệ.');
    }

    const recipe = await this.recipeModel.findById(dto.recipeId);
    if (!recipe) {
      throw new NotFoundException('Món ăn không tồn tại hoặc đã bị xoá.');
    }

    const totalPrice = recipe.giaCoBan * dto.portions;

    const newOrder = new this.orderModel({
      userId: new Types.ObjectId(userId),
      userName: userName || 'Khách hàng',
      userEmail: userEmail || '',
      recipeId: recipe._id,
      recipeSnapshot: {
        name: recipe.name,
        giaCoBan: recipe.giaCoBan,
        imgUrl: recipe.imgUrl,
        category: recipe.category,
        description: recipe.description,
        toppings: recipe.toppings || [],
      },
      portions: dto.portions,
      note: dto.note?.trim() || '',
      desiredTime: dto.desiredTime?.trim() || 'Nhận ngay',
      totalPrice,
      status: OrderStatus.PENDING,
      cancelReason: '',
    });

    const saved = await newOrder.save();

    // Broadcast SSE realtime event for new order
    this.realtimeService.sendEvent({
      type: 'ORDER_CREATED',
      message: `Đơn hàng mới: ${saved.recipeSnapshot.name} (${saved.portions} phần)`,
      orderId: saved.id,
      status: saved.status,
      data: saved,
    });

    return saved;
  }

  async findMyOrders(userId: string) {
    if (!Types.ObjectId.isValid(userId)) throw new BadRequestException('Invalid userId');
    return this.orderModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async update(orderId: string, userId: string, dto: UpdateOrderDto) {
    if (!Types.ObjectId.isValid(orderId)) throw new NotFoundException('Order not found');
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');

    if (order.userId.toString() !== userId) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa đơn hàng này');
    }

    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        'Chỉ có thể chỉnh sửa khi đơn hàng đang ở trạng thái "Chờ tiếp nhận"',
      );
    }

    if (dto.portions !== undefined && dto.portions > 0) {
      order.portions = dto.portions;
      order.totalPrice = order.recipeSnapshot.giaCoBan * dto.portions;
    }

    if (dto.note !== undefined) {
      order.note = dto.note.trim();
    }

    if (dto.desiredTime !== undefined) {
      order.desiredTime = dto.desiredTime.trim();
    }

    return order.save();
  }

  async cancel(orderId: string, userId: string) {
    if (!Types.ObjectId.isValid(orderId)) throw new NotFoundException('Không tìm thấy đơn hàng');
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (order.userId.toString() !== userId) {
      throw new ForbiddenException('Bạn không có quyền huỷ đơn hàng này');
    }

    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Không thể huỷ đơn hàng đã hoàn tất hoặc đã bị huỷ');
    }

    order.status = OrderStatus.CANCELLED;
    order.cancelReason = 'Khách hàng tự huỷ đơn';
    const saved = await order.save();

    this.realtimeService.sendEvent({
      type: 'ORDER_STATUS_CHANGED',
      message: `Đơn hàng "${saved.recipeSnapshot.name}" đã được huỷ bởi khách hàng`,
      orderId: saved.id,
      status: saved.status,
      data: saved,
    });

    return saved;
  }

  async adminFindAll(status?: string, keyword?: string) {
    const query: any = {};
    if (status && status.trim() && status !== 'Tất cả') {
      query.status = status.trim();
    }
    if (keyword && keyword.trim()) {
      const rawKey = keyword.trim();
      const cleanCode = rawKey.replace(/^#/, '').trim();
      const words = cleanCode.split(/\s+/).filter((w) => w.length > 0);

      if (words.length > 0) {
        const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Positive lookahead matches all words regardless of their order
        const lookaheadPattern = words.map((w) => `(?=.*${escapeRegex(w)})`).join('');

        const orConditions: any[] = [
          { userName: { $regex: lookaheadPattern, $options: 'i' } },
          { userEmail: { $regex: lookaheadPattern, $options: 'i' } },
          { 'recipeSnapshot.name': { $regex: lookaheadPattern, $options: 'i' } },
        ];

        // Search by Order ID (supports partial code, case-insensitive, with/without #)
        if (cleanCode.length > 0) {
          orConditions.push({
            $expr: {
              $regexMatch: {
                input: { $toString: '$_id' },
                regex: escapeRegex(cleanCode),
                options: 'i',
              },
            },
          });
        }

        query.$or = orConditions;
      }
    }
    return this.orderModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async adminUpdateStatus(orderId: string, dto: UpdateOrderStatusDto) {
    if (!Types.ObjectId.isValid(orderId)) throw new NotFoundException('Không tìm thấy đơn hàng');
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Không tìm thấy đơn hàng');

    if (dto.status === OrderStatus.CANCELLED) {
      if (!dto.cancelReason || !dto.cancelReason.trim()) {
        throw new BadRequestException('Vui lòng nhập lý do huỷ đơn hàng');
      }
      order.cancelReason = dto.cancelReason.trim();
    }

    order.status = dto.status;
    const saved = await order.save();

    // Broadcast SSE realtime event for order status update
    this.realtimeService.sendEvent({
      type: 'ORDER_STATUS_CHANGED',
      message: `Đơn hàng "${saved.recipeSnapshot.name}" đã chuyển trạng thái sang "${saved.status}"`,
      orderId: saved.id,
      status: saved.status,
      data: saved,
    });

    return saved;
  }
}
