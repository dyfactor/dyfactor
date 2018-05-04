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
const fs = require("fs");
const inquirer_1 = require("inquirer");
const ora = require("ora");
const puppeteer_1 = require("puppeteer");
function modeFactory(mode, env, plugin) {
    switch (mode) {
        case 0 /* analyze */:
            return new AnalyzeMode(env, plugin);
        case 1 /* data */:
            return new DataMode(env, plugin);
        case 3 /* havoc */:
            return new HavocMode(env, plugin);
    }
    throw new Error(`Mode not found`);
}
exports.modeFactory = modeFactory;
class BaseMode {
    constructor(env, plugin) {
        this.env = env;
        this.plugin = plugin;
    }
    analyze() { return; }
    apply(_meta) { return; }
    prepare() {
        return Promise.resolve();
    }
    run() {
        return Promise.resolve({ data: [] });
    }
}
exports.BaseMode = BaseMode;
class AnalyzeMode extends BaseMode {
    analyze() {
        let spinner = ora('Appling CodeMods ...').start();
        this.plugin.analyze();
        spinner.succeed('Applied CodeMods');
    }
}
exports.AnalyzeMode = AnalyzeMode;
class DataMode extends BaseMode {
    constructor() {
        super(...arguments);
        this.workingBranch = '';
    }
    prepare() {
        return __awaiter(this, void 0, void 0, function* () {
            let { env } = this;
            let spinner = this.spinner = ora('Applying instrumentation ...').start();
            this.workingBranch = yield env.currentBranch();
            yield env.scratchBranch('refactor');
            this.plugin.prepare();
            this.spinner = spinner.succeed('Applied instrumentation');
        });
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            let { spinner, env } = this;
            spinner.start('Starting build ...');
            yield env.build();
            spinner = spinner.succeed('Build complete');
            yield inquirer_1.prompt([{
                    type: 'confirm',
                    name: 'confirmed',
                    message: 'Please start your dev server. When your server is up please continue.'
                }]);
            spinner = spinner.succeed(`Server is running`);
            let browser = yield puppeteer_1.launch({ headless: false, slowMo: 250 });
            let page = yield browser.newPage();
            let meta = { data: [] };
            page.on('console', msg => {
                let json = msg.text();
                if (!json.includes('DEBUG:')) {
                    meta.data.push(json);
                }
            });
            let navigationOptions = env.navigation.options ? env.navigation.options : {};
            for (let url of env.navigation.urls) {
                spinner.start(`Visiting ${url} ...`);
                yield page.goto(url, navigationOptions);
                spinner = spinner.succeed(`Visited ${url}`);
            }
            yield browser.close();
            yield env.commit();
            yield env.checkoutBranch(this.workingBranch);
            yield env.deleteScratchBranch();
            return meta;
        });
    }
    apply(meta) {
        fs.writeFileSync('dyfactor-metadata.json', JSON.stringify(meta));
    }
}
exports.DataMode = DataMode;
class HavocMode extends DataMode {
    apply(meta) {
        this.plugin.applyMeta(meta);
    }
}
exports.HavocMode = HavocMode;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZS5qcyIsInNvdXJjZVJvb3QiOiIvVXNlcnMvY2hpZXRhbGEvQ29kZS9keWZhY3Rvci8iLCJzb3VyY2VzIjpbInJ1bnRpbWUvbW9kZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7O0FBQUEseUJBQXlCO0FBQ3pCLHVDQUFrQztBQUNsQywyQkFBMkI7QUFDM0IseUNBQW1DO0FBV25DLHFCQUE0QixJQUFZLEVBQUUsR0FBZ0IsRUFBRSxNQUFlO0lBQ3pFLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDYjtZQUNFLE1BQU0sQ0FBQyxJQUFJLFdBQVcsQ0FBQyxHQUFHLEVBQUUsTUFBc0IsQ0FBQyxDQUFDO1FBQ3REO1lBQ0UsTUFBTSxDQUFDLElBQUksUUFBUSxDQUFDLEdBQUcsRUFBRSxNQUF1QixDQUFDLENBQUM7UUFDcEQ7WUFDRSxNQUFNLENBQUMsSUFBSSxTQUFTLENBQUMsR0FBRyxFQUFFLE1BQXVCLENBQUMsQ0FBQztJQUN2RCxDQUFDO0lBRUQsTUFBTSxJQUFJLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3BDLENBQUM7QUFYRCxrQ0FXQztBQWFEO0lBQ0UsWUFBc0IsR0FBZ0IsRUFBWSxNQUFTO1FBQXJDLFFBQUcsR0FBSCxHQUFHLENBQWE7UUFBWSxXQUFNLEdBQU4sTUFBTSxDQUFHO0lBQUcsQ0FBQztJQUMvRCxPQUFPLEtBQVcsTUFBTSxDQUFDLENBQUMsQ0FBQztJQUMzQixLQUFLLENBQUMsS0FBVyxJQUFVLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDcEMsT0FBTztRQUNMLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxFQUFFLENBQUM7SUFDM0IsQ0FBQztJQUNELEdBQUc7UUFDRCxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxFQUFFLElBQUksRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ3ZDLENBQUM7Q0FDRjtBQVZELDRCQVVDO0FBRUQsaUJBQXlCLFNBQVEsUUFBc0I7SUFD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Q0FBQyxLQUFLLEVBQUUsQ0FBQztZQUV0QixNQUFNLEdBQUcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNuQixNQUFNLEdBQUcsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1lBQzdDLE1BQU0sR0FBRyxDQUFDLG1CQUFtQixFQUFFLENBQUM7WUFFaEMsTUFBTSxDQUFDLElBQUksQ0FBQztRQUNkLENBQUM7S0FBQTtJQUVELEtBQUssQ0FBQyxJQUFVO1FBQ2QsRUFBRSxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDbkUsQ0FBQztDQUNGO0FBL0RELDRCQStEQztBQUVELGVBQXVCLFNBQVEsUUFBUTtJQUNyQyxLQUFLLENBQUMsSUFBVTtRQUNkLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBQzlCLENBQUM7Q0FDRjtBQUpELDhCQUlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHsgcHJvbXB0IH0gZnJvbSAnaW5xdWlyZXInO1xuaW1wb3J0ICogYXMgb3JhIGZyb20gJ29yYSc7XG5pbXBvcnQgeyBsYXVuY2ggfSBmcm9tICdwdXBwZXRlZXInO1xuaW1wb3J0IHsgRHluYW1pY1BsdWdpbiwgTWV0YSwgUGx1Z2lucywgU3RhdGljUGx1Z2luIH0gZnJvbSAnLi4vcGx1Z2lucy9wbHVnaW4nO1xuaW1wb3J0IHsgRW52aXJvbm1lbnQgfSBmcm9tICcuL2Vudmlyb25tZW50JztcblxuZXhwb3J0IGNvbnN0IGVudW0gTW9kZXMge1xuICBhbmFseXplLFxuICBkYXRhLFxuICBzYWZlLFxuICBoYXZvY1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbW9kZUZhY3RvcnkobW9kZTogbnVtYmVyLCBlbnY6IEVudmlyb25tZW50LCBwbHVnaW46IFBsdWdpbnMpIHtcbiAgc3dpdGNoIChtb2RlKSB7XG4gICAgY2FzZSBNb2Rlcy5hbmFseXplOlxuICAgICAgcmV0dXJuIG5ldyBBbmFseXplTW9kZShlbnYsIHBsdWdpbiBhcyBTdGF0aWNQbHVnaW4pO1xuICAgIGNhc2UgTW9kZXMuZGF0YTpcbiAgICAgIHJldHVybiBuZXcgRGF0YU1vZGUoZW52LCBwbHVnaW4gYXMgRHluYW1pY1BsdWdpbik7XG4gICAgY2FzZSBNb2Rlcy5oYXZvYzpcbiAgICAgIHJldHVybiBuZXcgSGF2b2NNb2RlKGVudiwgcGx1Z2luIGFzIER5bmFtaWNQbHVnaW4pO1xuICB9XG5cbiAgdGhyb3cgbmV3IEVycm9yKGBNb2RlIG5vdCBmb3VuZGApO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE1vZGVDb25zdHJ1Y3RvcjxUPiB7XG4gIG5ldyAoZW52OiBFbnZpcm9ubWVudCwgcGx1Z2luOiBUKTogQmFzZU1vZGU8VD47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTW9kZSB7XG4gIGFuYWx5emUoKTogdm9pZDtcbiAgYXBwbHkobWV0YTogTWV0YSk6IHZvaWQ7XG4gIHByZXBhcmUoKTogUHJvbWlzZTx2b2lkPjtcbiAgcnVuKCk6IFByb21pc2U8TWV0YT47XG59XG5cbmV4cG9ydCBjbGFzcyBCYXNlTW9kZTxUPiBpbXBsZW1lbnRzIE1vZGUge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgZW52OiBFbnZpcm9ubWVudCwgcHJvdGVjdGVkIHBsdWdpbjogVCkge31cbiAgYW5hbHl6ZSgpOiB2b2lkIHsgcmV0dXJuOyB9XG4gIGFwcGx5KF9tZXRhOiBNZXRhKTogdm9pZCB7IHJldHVybjsgfVxuICBwcmVwYXJlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgfVxuICBydW4oKTogUHJvbWlzZTxNZXRhPiB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7IGRhdGE6IFtdIH0pO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBBbmFseXplTW9kZSBleHRlbmRzIEJhc2VNb2RlPFN0YXRpY1BsdWdpbj4ge1xuICBhbmFseXplKCk6IHZvaWQge1xuICAgIGxldCBzcGlubmVyID0gb3JhKCdBcHBsaW5nIENvZGVNb2RzIC4uLicpLnN0YXJ0KCk7XG4gICAgdGhpcy5wbHVnaW4uYW5hbHl6ZSgpO1xuICAgIHNwaW5uZXIuc3VjY2VlZCgnQXBwbGllZCBDb2RlTW9kcycpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBEYXRhTW9kZSBleHRlbmRzIEJhc2VNb2RlPER5bmFtaWNQbHVnaW4+IHtcbiAgcHJpdmF0ZSB3b3JraW5nQnJhbmNoOiBzdHJpbmcgPSAnJztcbiAgcHJpdmF0ZSBzcGlubmVyOiBhbnk7XG4gIGFzeW5jIHByZXBhcmUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgbGV0IHsgZW52IH0gPSB0aGlzO1xuICAgIGxldCBzcGlubmVyID0gdGhpcy5zcGlubmVyID0gb3JhKCdBcHBseWluZyBpbnN0cnVtZW50YXRpb24gLi4uJykuc3RhcnQoKTtcblxuICAgIHRoaXMud29ya2luZ0JyYW5jaCA9IGF3YWl0IGVudi5jdXJyZW50QnJhbmNoKCk7XG5cbiAgICBhd2FpdCBlbnYuc2NyYXRjaEJyYW5jaCgncmVmYWN0b3InKTtcblxuICAgIHRoaXMucGx1Z2luLnByZXBhcmUoKTtcblxuICAgIHRoaXMuc3Bpbm5lciA9IHNwaW5uZXIuc3VjY2VlZCgnQXBwbGllZCBpbnN0cnVtZW50YXRpb24nKTtcbiAgfVxuXG4gIGFzeW5jIHJ1bigpOiBQcm9taXNlPE1ldGE+IHtcbiAgICBsZXQgeyBzcGlubmVyLCBlbnYgfSA9IHRoaXM7XG4gICAgc3Bpbm5lci5zdGFydCgnU3RhcnRpbmcgYnVpbGQgLi4uJyk7XG5cbiAgICBhd2FpdCBlbnYuYnVpbGQoKTtcblxuICAgIHNwaW5uZXIgPSBzcGlubmVyLnN1Y2NlZWQoJ0J1aWxkIGNvbXBsZXRlJyk7XG5cbiAgICBhd2FpdCBwcm9tcHQoW3tcbiAgICAgIHR5cGU6ICdjb25maXJtJyxcbiAgICAgIG5hbWU6ICdjb25maXJtZWQnLFxuICAgICAgbWVzc2FnZTogJ1BsZWFzZSBzdGFydCB5b3VyIGRldiBzZXJ2ZXIuIFdoZW4geW91ciBzZXJ2ZXIgaXMgdXAgcGxlYXNlIGNvbnRpbnVlLidcbiAgICB9XSk7XG5cbiAgICBzcGlubmVyID0gc3Bpbm5lci5zdWNjZWVkKGBTZXJ2ZXIgaXMgcnVubmluZ2ApO1xuXG4gICAgbGV0IGJyb3dzZXIgPSBhd2FpdCBsYXVuY2goeyBoZWFkbGVzczogZmFsc2UsIHNsb3dNbzogMjUwIH0pO1xuICAgIGxldCBwYWdlID0gYXdhaXQgYnJvd3Nlci5uZXdQYWdlKCk7XG5cbiAgICBsZXQgbWV0YTogTWV0YSA9IHsgZGF0YTogW10gfTtcbiAgICBwYWdlLm9uKCdjb25zb2xlJywgbXNnID0+IHtcbiAgICAgIGxldCBqc29uID0gbXNnLnRleHQoKTtcbiAgICAgIGlmICghanNvbi5pbmNsdWRlcygnREVCVUc6JykpIHtcbiAgICAgICAgbWV0YS5kYXRhLnB1c2goanNvbik7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBsZXQgbmF2aWdhdGlvbk9wdGlvbnMgPSBlbnYubmF2aWdhdGlvbiEub3B0aW9ucyA/IGVudi5uYXZpZ2F0aW9uIS5vcHRpb25zIDoge307XG5cbiAgICBmb3IgKGxldCB1cmwgb2YgZW52Lm5hdmlnYXRpb24hLnVybHMpIHtcbiAgICAgIHNwaW5uZXIuc3RhcnQoYFZpc2l0aW5nICR7dXJsfSAuLi5gKTtcbiAgICAgIGF3YWl0IHBhZ2UuZ290byh1cmwsIG5hdmlnYXRpb25PcHRpb25zKTtcbiAgICAgIHNwaW5uZXIgPSBzcGlubmVyLnN1Y2NlZWQoYFZpc2l0ZWQgJHt1cmx9YCk7XG4gICAgfVxuXG4gICAgYXdhaXQgYnJvd3Nlci5jbG9zZSgpO1xuXG4gICAgYXdhaXQgZW52LmNvbW1pdCgpO1xuICAgIGF3YWl0IGVudi5jaGVja291dEJyYW5jaCh0aGlzLndvcmtpbmdCcmFuY2gpO1xuICAgIGF3YWl0IGVudi5kZWxldGVTY3JhdGNoQnJhbmNoKCk7XG5cbiAgICByZXR1cm4gbWV0YTtcbiAgfVxuXG4gIGFwcGx5KG1ldGE6IE1ldGEpOiB2b2lkIHtcbiAgICBmcy53cml0ZUZpbGVTeW5jKCdkeWZhY3Rvci1tZXRhZGF0YS5qc29uJywgSlNPTi5zdHJpbmdpZnkobWV0YSkpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBIYXZvY01vZGUgZXh0ZW5kcyBEYXRhTW9kZSB7XG4gIGFwcGx5KG1ldGE6IE1ldGEpOiB2b2lkIHtcbiAgICB0aGlzLnBsdWdpbi5hcHBseU1ldGEobWV0YSk7XG4gIH1cbn1cbiJdfQ==