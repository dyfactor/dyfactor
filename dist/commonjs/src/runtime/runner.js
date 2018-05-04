"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const mode_1 = require("./mode");
class Runner {
    constructor(env) {
        this.env = env;
    }
    run(type, name, path = 'app', level = 3) {
        return __awaiter(this, void 0, void 0, function* () {
            let { env } = this;
            env.loadPlugins();
            let Plugin = env.lookupPlugin(type, name);
            let { capabilities } = Plugin;
            let plugin = new Plugin(path, env);
            let mode = mode_1.modeFactory(level, env, plugin);
            if (capabilities.runtime) {
                yield mode.prepare();
                let meta = yield mode.run();
                mode.apply(meta);
            }
            else {
                mode.analyze();
            }
        });
    }
}
exports.Runner = Runner;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVubmVyLmpzIiwic291cmNlUm9vdCI6Ii9Vc2Vycy9jaGlldGFsYS9Db2RlL2R5ZmFjdG9yLyIsInNvdXJjZXMiOlsicnVudGltZS9ydW5uZXIudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7OztBQUNBLGlDQUFxQztBQUVyQztJQUNFLFlBQW9CLEdBQWdCO1FBQWhCLFFBQUcsR0FBSCxHQUFHLENBQWE7SUFBRyxDQUFDO0lBRWxDLEdBQUcsQ0FBQyxJQUFZLEVBQUUsSUFBWSxFQUFFLE9BQWUsS0FBSyxFQUFFLEtBQUssR0FBRyxDQUFDOztZQUNuRSxJQUFJLEVBQUUsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDO1lBQ25CLEdBQUcsQ0FBQyxXQUFXLEVBQUUsQ0FBQztZQUNsQixJQUFJLE1BQU0sR0FBRyxHQUFHLENBQUMsWUFBWSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQztZQUMxQyxJQUFJLEVBQUUsWUFBWSxFQUFFLEdBQUcsTUFBTSxDQUFDO1lBQzlCLElBQUksTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsQ0FBQztZQUNuQyxJQUFJLElBQUksR0FBRyxrQkFBVyxDQUFDLEtBQUssRUFBRSxHQUFHLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFFM0MsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7Z0JBQ3pCLE1BQU0sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO2dCQUNyQixJQUFJLElBQUksR0FBRyxNQUFNLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztnQkFDNUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNuQixDQUFDO1lBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQ04sSUFBSSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ2pCLENBQUM7UUFDSCxDQUFDO0tBQUE7Q0FDRjtBQW5CRCx3QkFtQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBFbnZpcm9ubWVudCB9IGZyb20gJy4vZW52aXJvbm1lbnQnO1xuaW1wb3J0IHsgbW9kZUZhY3RvcnkgfSBmcm9tICcuL21vZGUnO1xuXG5leHBvcnQgY2xhc3MgUnVubmVyIHtcbiAgY29uc3RydWN0b3IocHJpdmF0ZSBlbnY6IEVudmlyb25tZW50KSB7fVxuXG4gIGFzeW5jIHJ1bih0eXBlOiBzdHJpbmcsIG5hbWU6IHN0cmluZywgcGF0aDogc3RyaW5nID0gJ2FwcCcsIGxldmVsID0gMykge1xuICAgIGxldCB7IGVudiB9ID0gdGhpcztcbiAgICBlbnYubG9hZFBsdWdpbnMoKTtcbiAgICBsZXQgUGx1Z2luID0gZW52Lmxvb2t1cFBsdWdpbih0eXBlLCBuYW1lKTtcbiAgICBsZXQgeyBjYXBhYmlsaXRpZXMgfSA9IFBsdWdpbjtcbiAgICBsZXQgcGx1Z2luID0gbmV3IFBsdWdpbihwYXRoLCBlbnYpO1xuICAgIGxldCBtb2RlID0gbW9kZUZhY3RvcnkobGV2ZWwsIGVudiwgcGx1Z2luKTtcblxuICAgIGlmIChjYXBhYmlsaXRpZXMucnVudGltZSkge1xuICAgICAgYXdhaXQgbW9kZS5wcmVwYXJlKCk7XG4gICAgICBsZXQgbWV0YSA9IGF3YWl0IG1vZGUucnVuKCk7XG4gICAgICBtb2RlLmFwcGx5KG1ldGEpO1xuICAgIH0gZWxzZSB7XG4gICAgICBtb2RlLmFuYWx5emUoKTtcbiAgICB9XG4gIH1cbn1cbiJdfQ==