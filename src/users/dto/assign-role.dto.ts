import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '../../common/decorators/roles.decorator';

export class AssignRoleDto {
  @IsNotEmpty({ message: 'Role không được để trống' })
  @IsEnum(Role, { message: 'Role phải là USER hoặc ADMIN' })
  role: Role;
}
