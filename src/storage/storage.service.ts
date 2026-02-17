import {Injectable} from "@nestjs/common";
import {LocalStorage} from "@/storage/drivers/local.storage";

@Injectable()
export class StorageService {
    //for local folder
    async upload(file: Express.Multer.File, folderName?: string): Promise<{ url: string }> {
        const url = await LocalStorage.upload(file, folderName);
        return {url};
    }
}
