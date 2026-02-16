import {Module} from '@nestjs/common';
import {AppController} from './app.controller';
import {AppService} from './app.service';
import {TypeOrmModule} from "@nestjs/typeorm";
import ormconfig from "@/ormconfig";
import {AuthModule} from '@/modules/auth/auth.module';
import {UsersModule} from '@/modules/users/users.module';
import {ConfigModule} from '@nestjs/config';
import {CategoryModule} from "@/modules/category/category.module";
import {PageModule} from '@/modules/page/page.module';
import {MenuModule} from '@/modules/menu/menu.module';
import {PostModule} from '@/modules/post/post.module';
import {LogoModule} from '@/modules/logo/logo.module';
import {RoleModule} from '@/modules/roles/role.module';
import {SiteSettingModule} from '@/modules/site-setting/site-setting.module';
import {MediaModule} from "@/modules/media-manager/media.module";
import { SectionModule } from './modules/section/section.module';
import { TestimonialModule } from '@/modules/testimonial/testimonial.module';
import { WorkingGroupModule } from '@/modules/working-group/working-group.module';
import { ContactMessageModule } from '@/modules/contact-message/contact-message.module';


@Module({
    imports: [
        TypeOrmModule.forRoot(ormconfig),
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        AuthModule,
        UsersModule,
        CategoryModule,
        PageModule,
        MenuModule,
        PostModule,
        LogoModule,
        RoleModule,
        SiteSettingModule,
        MediaModule,
        SectionModule,
        TestimonialModule,
        WorkingGroupModule,
        ContactMessageModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {
}
