//Multiple Media Response
import {MediaResponseInterface} from "@/modules/media-manager/types/media-response-interface";

export interface MediasResponseInterface {
    success?: boolean;
    message?: string;
    page: number;
    pageSize: number;
    total: number;
    data: MediaResponseInterface[];
}
