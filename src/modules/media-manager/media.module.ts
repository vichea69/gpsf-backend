import {Module} from "@nestjs/common";
import {MediaController} from "./media.controller";
import {TypeOrmModule} from "@nestjs/typeorm";
import {Media} from "@/modules/media-manager/media.entity";
import { MediaFolder } from '@/modules/media-manager/media-folder.entity';
import {StorageModule} from "@/storage/storage.module";
import {MediaService} from "@/modules/media-manager/media.service";
import { AuthModule } from '@/modules/auth/auth.module';
import { RoleModule } from '@/modules/roles/role.module';


@Module({
    imports: [
        TypeOrmModule.forFeature([Media, MediaFolder]),
        StorageModule,
        AuthModule,
        RoleModule,
    ],
    controllers: [MediaController],
    providers: [MediaService],
    exports: [MediaService],
})
export class MediaModule {

}
