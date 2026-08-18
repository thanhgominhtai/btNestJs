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

  async getDashboardStats(startDate?: string, endDate?: string) {
    const timeMatch: any = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      timeMatch.createdAt = { $gte: start, $lte: end };
    }

    // 1. Overall counts
    const totalOrders = await this.orderModel.countDocuments(timeMatch);
    const totalRecipes = await this.recipeModel.countDocuments();
    const totalUsers = await this.userModel.countDocuments();
    const newUsersCount = Object.keys(timeMatch).length > 0 
      ? await this.userModel.countDocuments(timeMatch) 
      : totalUsers;

    // 2. Sum revenue of non-cancelled orders
    const revenueAgg = await this.orderModel.aggregate([
      { $match: { ...timeMatch, status: { $ne: OrderStatus.CANCELLED } } },
      { $group: { _id: null, total: { $sum: '$totalPrice' } } },
    ]);
    const totalRevenue = revenueAgg.length > 0 ? revenueAgg[0].total : 0;

    // 3. Status breakdown
    const statusCountsAgg = await this.orderModel.aggregate([
      { $match: timeMatch },
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

    // 4. Top 5 most ordered recipes
    const topRecipesAgg = await this.orderModel.aggregate([
      { $match: { ...timeMatch, status: { $ne: OrderStatus.CANCELLED } } },
      {
        $group: {
          _id: '$recipeSnapshot.name',
          category: { $first: '$recipeSnapshot.category' },
          portionsSold: { $sum: '$portions' },
          totalSales: { $sum: '$totalPrice' },
        },
      },
      { $sort: { portionsSold: -1 } },
      { $limit: 5 },
    ]);

    // 5. Timeline revenue and orders (for Trend Chart)
    const timelineAgg = await this.orderModel.aggregate([
      { $match: { ...timeMatch, status: { $ne: OrderStatus.CANCELLED } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: '$totalPrice' },
          orders: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $limit: 31 },
    ]);

    // 6. Category breakdown
    const categoryAgg = await this.orderModel.aggregate([
      { $match: { ...timeMatch, status: { $ne: OrderStatus.CANCELLED } } },
      {
        $group: {
          _id: '$recipeSnapshot.category',
          revenue: { $sum: '$totalPrice' },
          portions: { $sum: '$portions' },
        },
      },
      { $sort: { revenue: -1 } },
    ]);

    // 7. Peak hours distribution
    const hourlyAgg = await this.orderModel.aggregate([
      { $match: timeMatch },
      {
        $project: {
          hour: { $hour: { date: '$createdAt', timezone: '+07:00' } },
        },
      },
      {
        $group: {
          _id: '$hour',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // 8. Top 5 VIP Customers
    const topCustomersAgg = await this.orderModel.aggregate([
      { $match: { ...timeMatch, status: { $ne: OrderStatus.CANCELLED } } },
      {
        $group: {
          _id: '$userEmail',
          userName: { $first: '$userName' },
          totalSpent: { $sum: '$totalPrice' },
          orderCount: { $sum: 1 },
        },
      },
      { $sort: { totalSpent: -1 } },
      { $limit: 5 },
    ]);

    // 9. Popular Toppings
    const toppingsAgg = await this.orderModel.aggregate([
      { $match: { ...timeMatch, status: { $ne: OrderStatus.CANCELLED } } },
      { $unwind: '$recipeSnapshot.toppings' },
      {
        $group: {
          _id: '$recipeSnapshot.toppings.name',
          count: { $sum: '$recipeSnapshot.toppings.quantity' },
        },
      },
      { $sort: { count: -1 } },
      { $limit: 5 },
    ]);

    return {
      kpi: {
        totalRevenue,
        totalOrders,
        totalRecipes,
        totalUsers,
        newUsersCount,
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
        category: r.category || 'Món nước',
        portionsSold: r.portionsSold,
        totalSales: r.totalSales,
      })),
      timeline: timelineAgg.map((t) => ({
        date: t._id,
        revenue: t.revenue,
        orders: t.orders,
      })),
      categories: categoryAgg.map((c) => ({
        category: c._id || 'Khác',
        revenue: c.revenue,
        portions: c.portions,
      })),
      peakHours: hourlyAgg.map((h) => ({
        hour: h._id,
        count: h.count,
      })),
      topCustomers: topCustomersAgg.map((u) => ({
        email: u._id || '',
        name: u.userName || 'Khách hàng',
        totalSpent: u.totalSpent,
        orderCount: u.orderCount,
      })),
      topToppings: toppingsAgg.map((top) => ({
        name: top._id || 'Topping',
        count: top.count,
      })),
    };
  }
}
