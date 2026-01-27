import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SectionController } from "./section.controller";
import { SectionService } from "./section.service";
import { SectionEntity } from "./section.entity";
import { PageModule } from "@/modules/page/page.module";
import { PostEntity } from "@/modules/post/post.entity";
import { CategoryEntity } from "@/modules/category/category.entity";

@Module({
    imports: [TypeOrmModule.forFeature([SectionEntity, PostEntity, CategoryEntity]), forwardRef(() => PageModule)],
    controllers: [SectionController],
    providers: [SectionService],
    exports: [SectionService],
})
export class SectionModule {}
