import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument, OrderStatus } from '../orders/entities/order.entity';
import { Recipe, RecipeDocument } from '../recipes/entities/recipe.entity';
import { User, UserDocument } from '../users/entities/user.entity';

@Injectable()
export class StatsService {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    @InjectModel(Recipe.name) private readonly recipeModel: Model<RecipeDocument>,
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async getDashboardStats() {
    const totalOrders = await this.orderModel.countDocuments();
    const totalRecipes = await this.recipeModel.countDocuments();
    const totalUsers = await this.userModel.countDocuments();

    // Sum revenue of completed orders
    const revenueAgg = await this.orderModel.aggregate([
      { $match: { status: { $ne: OrderStatus.CANCELLED } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);
    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    // Status breakdown for Doughnut Chart
    const statusCountsAgg = await this.orderModel.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const statusMap: Record<string, number> = {
      [OrderStatus.PENDING]: 0,
      [OrderStatus.IN_PROGRESS]: 0,
      [OrderStatus.COMPLETED]: 0,
      [OrderStatus.CANCELLED]: 0,
    };
    statusCountsAgg.forEach((item) => {
      if (item._id) {
        statusMap[item._id] = item.count;
      }
    });

    // Top 5 most ordered recipes for Bar Chart
    const topRecipesAgg = await this.orderModel.aggregate([
      { $match: { status: { $ne: OrderStatus.CANCELLED } } },
      {
        $group: {
          _id: '$recipeSnapshot.name',
          portionsSold: { $sum: '$portions' },
          totalSales: { $sum: '$totalPrice' },
        },
      },
      { $sort: { portionsSold: -1 } },
      { $limit: 5 },
    ]);

    return {
      kpi: {
        totalRevenue,
        totalOrders,
        totalRecipes,
        totalUsers,
        pendingOrders: statusMap[OrderStatus.PENDING],
        inProgressOrders: statusMap[OrderStatus.IN_PROGRESS],
        completedOrders: statusMap[OrderStatus.COMPLETED],
        cancelledOrders: statusMap[OrderStatus.CANCELLED],
      },
      statusBreakdown: Object.entries(statusMap).map(([status, count]) => ({
        status,
        count,
      })),
      topRecipes: topRecipesAgg.map((r) => ({
        name: r._id || 'Không xác định',
        portionsSold: r.portionsSold,
        totalSales: r.totalSales,
      })),
    };
  }
}
