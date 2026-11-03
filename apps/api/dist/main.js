"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    const origins = (configService.get('ALLOWED_ORIGINS') ??
        configService.get('APP_URL') ??
        'http://localhost:5173')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin) {
                callback(null, true);
                return;
            }
            if (origins.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(new Error('Origin non autorisée par la politique CORS de l\'API ENP'));
        },
        credentials: true,
        methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
    }));
    app.setGlobalPrefix('api/v1');
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Plateforme d\'Évaluation ENP & Cahier de Texte')
        .setDescription('API REST du monolithe modulaire ENP - Évaluation anonyme, cahier de texte et pilotage multi-campus')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    await app.listen(configService.get('PORT') ?? 3000);
}
bootstrap();
//# sourceMappingURL=main.js.map