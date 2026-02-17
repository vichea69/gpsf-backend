//Multiple Media Response
import {MediaResponseInterface} from "@/modules/media-manager/types/media-response-interface";
import { MediaFolder } from '@/modules/media-manager/media-folder.entity';

export interface MediasResponseInterface {
    success?: boolean;
    message?: string;
    page: number;
    pageSize: number;
    total: number;
    data: MediaResponseInterface[];
    folders?: MediaFolder[];
}
