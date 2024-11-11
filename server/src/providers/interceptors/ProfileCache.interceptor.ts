import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cache } from 'cache-manager';
import { Observable, tap } from 'rxjs';
import { PostgresDatabaseProviderService } from '../database/postgres/provider.service';
import { ProfileCacheService } from 'src/app/modules/auth/services/profileCache.service';

@Injectable()
export class ProfileDataCacheInterceptor implements NestInterceptor {
  private ttl: number;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly configService: ConfigService,
    private readonly db: PostgresDatabaseProviderService,
    private readonly profileCacheService: ProfileCacheService
  ) {
    this.ttl =
      Number.parseInt(configService.get<string>('CACHE_ASIDE_TTL')) || 3600000;
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler<any>
  ): Observable<any> | Promise<Observable<any>> {
    const req = context.switchToHttp().getRequest();
    const userId = req.userId;

    return next.handle().pipe(
      tap(async () => {
        const findProfile = this.db.profile.findFirst({
          where: {
            userId,
          },
        });

        const findServers = this.db.server.findMany({
          where: {
            members: {
              some: {
                profile: {
                  userId,
                },
              },
            },
          },
          include: {
            channels: true,
            members: {
              include: {
                profile: true,
              },
            },
          },
        });

        const [profile, servers] = await Promise.all([
          findProfile,
          findServers,
        ]);

        await Promise.all([
          this.profileCacheService.setProfileCache(userId, profile),
          this.profileCacheService.setUserJoinedServersCache(userId, servers),
        ]);
      })
    );
  }
}
