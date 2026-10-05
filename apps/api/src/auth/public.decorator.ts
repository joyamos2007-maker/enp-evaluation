import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'estPublique';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);