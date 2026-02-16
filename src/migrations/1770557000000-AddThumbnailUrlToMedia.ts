import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddThumbnailUrlToMedia1770557000000 implements MigrationInterface {
    name = 'AddThumbnailUrlToMedia1770557000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('media');
        if (!table) {
            throw new Error('Table "media" not found');
        }

        const thumbnailColumn = table.findColumnByName('thumbnailUrl');
        if (!thumbnailColumn) {
            await queryRunner.addColumn(
                'media',
                new TableColumn({
                    name: 'thumbnailUrl',
                    type: 'varchar',
                    length: '600',
                    isNullable: true,
                }),
            );
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const table = await queryRunner.getTable('media');
        if (!table) {
            return;
        }

        const thumbnailColumn = table.findColumnByName('thumbnailUrl');
        if (thumbnailColumn) {
            await queryRunner.dropColumn('media', thumbnailColumn);
        }
    }
}
