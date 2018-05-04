import * as fs from 'fs';
import { prompt } from 'inquirer';
import * as ora from 'ora';
import { launch } from 'puppeteer';
export function modeFactory(mode, env, plugin) {
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
export class BaseMode {
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
export class AnalyzeMode extends BaseMode {
    analyze() {
        let spinner = ora('Appling CodeMods ...').start();
        this.plugin.analyze();
        spinner.succeed('Applied CodeMods');
    }
}
export class DataMode extends BaseMode {
    constructor() {
        super(...arguments);
        this.workingBranch = '';
    }
    async prepare() {
        let { env } = this;
        let spinner = this.spinner = ora('Applying instrumentation ...').start();
        this.workingBranch = await env.currentBranch();
        await env.scratchBranch('refactor');
        this.plugin.prepare();
        this.spinner = spinner.succeed('Applied instrumentation');
    }
    async run() {
        let { spinner, env } = this;
        spinner.start('Starting build ...');
        await env.build();
        spinner = spinner.succeed('Build complete');
        await prompt([{
                type: 'confirm',
                name: 'confirmed',
                message: 'Please start your dev server. When your server is up please continue.'
            }]);
        spinner = spinner.succeed(`Server is running`);
        let browser = await launch({ headless: false, slowMo: 250 });
        let page = await browser.newPage();
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
            await page.goto(url, navigationOptions);
            spinner = spinner.succeed(`Visited ${url}`);
        }
        await browser.close();
        await env.commit();
        await env.checkoutBranch(this.workingBranch);
        await env.deleteScratchBranch();
        return meta;
    }
    apply(meta) {
        fs.writeFileSync('dyfactor-metadata.json', JSON.stringify(meta));
    }
}
export class HavocMode extends DataMode {
    apply(meta) {
        this.plugin.applyMeta(meta);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibW9kZS5qcyIsInNvdXJjZVJvb3QiOiIvVXNlcnMvY2hpZXRhbGEvQ29kZS9keWZhY3Rvci8iLCJzb3VyY2VzIjpbInJ1bnRpbWUvbW9kZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxPQUFPLEtBQUssRUFBRSxNQUFNLElBQUksQ0FBQztBQUN6QixPQUFPLEVBQUUsTUFBTSxFQUFFLE1BQU0sVUFBVSxDQUFDO0FBQ2xDLE9BQU8sS0FBSyxHQUFHLE1BQU0sS0FBSyxDQUFDO0FBQzNCLE9BQU8sRUFBRSxNQUFNLEVBQUUsTUFBTSxXQUFXLENBQUM7QUFXbkMsTUFBTSxzQkFBc0IsSUFBWSxFQUFFLEdBQWdCLEVBQUUsTUFBZTtJQUN6RSxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBQ2I7WUFDRSxNQUFNLENBQUMsSUFBSSxXQUFXLENBQUMsR0FBRyxFQUFFLE1BQXNCLENBQUMsQ0FBQztRQUN0RDtZQUNFLE1BQU0sQ0FBQyxJQUFJLFFBQVEsQ0FBQyxHQUFHLEVBQUUsTUFBdUIsQ0FBQyxDQUFDO1FBQ3BEO1lBQ0UsTUFBTSxDQUFDLElBQUksU0FBUyxDQUFDLEdBQUcsRUFBRSxNQUF1QixDQUFDLENBQUM7SUFDdkQsQ0FBQztJQUVELE1BQU0sSUFBSSxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUNwQyxDQUFDO0FBYUQsTUFBTTtJQUNKLFlBQXNCLEdBQWdCLEVBQVksTUFBUztRQUFyQyxRQUFHLEdBQUgsR0FBRyxDQUFhO1FBQVksV0FBTSxHQUFOLE1BQU0sQ0FBRztJQUFHLENBQUM7SUFDL0QsT0FBTyxLQUFXLE1BQU0sQ0FBQyxDQUFDLENBQUM7SUFDM0IsS0FBSyxDQUFDLEtBQVcsSUFBVSxNQUFNLENBQUMsQ0FBQyxDQUFDO0lBQ3BDLE9BQU87UUFDTCxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sRUFBRSxDQUFDO0lBQzNCLENBQUM7SUFDRCxHQUFHO1FBQ0QsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENB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QyxPQUFPLEdBQUcsT0FBTyxDQUFDLE9BQU8sQ0FBQyxXQUFXLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFDOUMsQ0FBQztRQUVELE1BQU0sT0FBTyxDQUFDLEtBQUssRUFBRSxDQUFDO1FBRXRCLE1BQU0sR0FBRyxDQUFDLE1BQU0sRUFBRSxDQUFDO1FBQ25CLE1BQU0sR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFDN0MsTUFBTSxHQUFHLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUVoQyxNQUFNLENBQUMsSUFBSSxDQUFDO0lBQ2QsQ0FBQztJQUVELEtBQUssQ0FBQyxJQUFVO1FBQ2QsRUFBRSxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDbkUsQ0FBQztDQUNGO0FBRUQsTUFBTSxnQkFBaUIsU0FBUSxRQUFRO0lBQ3JDLEtBQUssQ0FBQyxJQUFVO1FBQ2QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDOUIsQ0FBQztDQUNGIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZnMgZnJvbSAnZnMnO1xuaW1wb3J0IHsgcHJvbXB0IH0gZnJvbSAnaW5xdWlyZXInO1xuaW1wb3J0ICogYXMgb3JhIGZyb20gJ29yYSc7XG5pbXBvcnQgeyBsYXVuY2ggfSBmcm9tICdwdXBwZXRlZXInO1xuaW1wb3J0IHsgRHluYW1pY1BsdWdpbiwgTWV0YSwgUGx1Z2lucywgU3RhdGljUGx1Z2luIH0gZnJvbSAnLi4vcGx1Z2lucy9wbHVnaW4nO1xuaW1wb3J0IHsgRW52aXJvbm1lbnQgfSBmcm9tICcuL2Vudmlyb25tZW50JztcblxuZXhwb3J0IGNvbnN0IGVudW0gTW9kZXMge1xuICBhbmFseXplLFxuICBkYXRhLFxuICBzYWZlLFxuICBoYXZvY1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbW9kZUZhY3RvcnkobW9kZTogbnVtYmVyLCBlbnY6IEVudmlyb25tZW50LCBwbHVnaW46IFBsdWdpbnMpIHtcbiAgc3dpdGNoIChtb2RlKSB7XG4gICAgY2FzZSBNb2Rlcy5hbmFseXplOlxuICAgICAgcmV0dXJuIG5ldyBBbmFseXplTW9kZShlbnYsIHBsdWdpbiBhcyBTdGF0aWNQbHVnaW4pO1xuICAgIGNhc2UgTW9kZXMuZGF0YTpcbiAgICAgIHJldHVybiBuZXcgRGF0YU1vZGUoZW52LCBwbHVnaW4gYXMgRHluYW1pY1BsdWdpbik7XG4gICAgY2FzZSBNb2Rlcy5oYXZvYzpcbiAgICAgIHJldHVybiBuZXcgSGF2b2NNb2RlKGVudiwgcGx1Z2luIGFzIER5bmFtaWNQbHVnaW4pO1xuICB9XG5cbiAgdGhyb3cgbmV3IEVycm9yKGBNb2RlIG5vdCBmb3VuZGApO1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIE1vZGVDb25zdHJ1Y3RvcjxUPiB7XG4gIG5ldyAoZW52OiBFbnZpcm9ubWVudCwgcGx1Z2luOiBUKTogQmFzZU1vZGU8VD47XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgTW9kZSB7XG4gIGFuYWx5emUoKTogdm9pZDtcbiAgYXBwbHkobWV0YTogTWV0YSk6IHZvaWQ7XG4gIHByZXBhcmUoKTogUHJvbWlzZTx2b2lkPjtcbiAgcnVuKCk6IFByb21pc2U8TWV0YT47XG59XG5cbmV4cG9ydCBjbGFzcyBCYXNlTW9kZTxUPiBpbXBsZW1lbnRzIE1vZGUge1xuICBjb25zdHJ1Y3Rvcihwcm90ZWN0ZWQgZW52OiBFbnZpcm9ubWVudCwgcHJvdGVjdGVkIHBsdWdpbjogVCkge31cbiAgYW5hbHl6ZSgpOiB2b2lkIHsgcmV0dXJuOyB9XG4gIGFwcGx5KF9tZXRhOiBNZXRhKTogdm9pZCB7IHJldHVybjsgfVxuICBwcmVwYXJlKCk6IFByb21pc2U8dm9pZD4ge1xuICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoKTtcbiAgfVxuICBydW4oKTogUHJvbWlzZTxNZXRhPiB7XG4gICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7IGRhdGE6IFtdIH0pO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBBbmFseXplTW9kZSBleHRlbmRzIEJhc2VNb2RlPFN0YXRpY1BsdWdpbj4ge1xuICBhbmFseXplKCk6IHZvaWQge1xuICAgIGxldCBzcGlubmVyID0gb3JhKCdBcHBsaW5nIENvZGVNb2RzIC4uLicpLnN0YXJ0KCk7XG4gICAgdGhpcy5wbHVnaW4uYW5hbHl6ZSgpO1xuICAgIHNwaW5uZXIuc3VjY2VlZCgnQXBwbGllZCBDb2RlTW9kcycpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBEYXRhTW9kZSBleHRlbmRzIEJhc2VNb2RlPER5bmFtaWNQbHVnaW4+IHtcbiAgcHJpdmF0ZSB3b3JraW5nQnJhbmNoOiBzdHJpbmcgPSAnJztcbiAgcHJpdmF0ZSBzcGlubmVyOiBhbnk7XG4gIGFzeW5jIHByZXBhcmUoKTogUHJvbWlzZTx2b2lkPiB7XG4gICAgbGV0IHsgZW52IH0gPSB0aGlzO1xuICAgIGxldCBzcGlubmVyID0gdGhpcy5zcGlubmVyID0gb3JhKCdBcHBseWluZyBpbnN0cnVtZW50YXRpb24gLi4uJykuc3RhcnQoKTtcblxuICAgIHRoaXMud29ya2luZ0JyYW5jaCA9IGF3YWl0IGVudi5jdXJyZW50QnJhbmNoKCk7XG5cbiAgICBhd2FpdCBlbnYuc2NyYXRjaEJyYW5jaCgncmVmYWN0b3InKTtcblxuICAgIHRoaXMucGx1Z2luLnByZXBhcmUoKTtcblxuICAgIHRoaXMuc3Bpbm5lciA9IHNwaW5uZXIuc3VjY2VlZCgnQXBwbGllZCBpbnN0cnVtZW50YXRpb24nKTtcbiAgfVxuXG4gIGFzeW5jIHJ1bigpOiBQcm9taXNlPE1ldGE+IHtcbiAgICBsZXQgeyBzcGlubmVyLCBlbnYgfSA9IHRoaXM7XG4gICAgc3Bpbm5lci5zdGFydCgnU3RhcnRpbmcgYnVpbGQgLi4uJyk7XG5cbiAgICBhd2FpdCBlbnYuYnVpbGQoKTtcblxuICAgIHNwaW5uZXIgPSBzcGlubmVyLnN1Y2NlZWQoJ0J1aWxkIGNvbXBsZXRlJyk7XG5cbiAgICBhd2FpdCBwcm9tcHQoW3tcbiAgICAgIHR5cGU6ICdjb25maXJtJyxcbiAgICAgIG5hbWU6ICdjb25maXJtZWQnLFxuICAgICAgbWVzc2FnZTogJ1BsZWFzZSBzdGFydCB5b3VyIGRldiBzZXJ2ZXIuIFdoZW4geW91ciBzZXJ2ZXIgaXMgdXAgcGxlYXNlIGNvbnRpbnVlLidcbiAgICB9XSk7XG5cbiAgICBzcGlubmVyID0gc3Bpbm5lci5zdWNjZWVkKGBTZXJ2ZXIgaXMgcnVubmluZ2ApO1xuXG4gICAgbGV0IGJyb3dzZXIgPSBhd2FpdCBsYXVuY2goeyBoZWFkbGVzczogZmFsc2UsIHNsb3dNbzogMjUwIH0pO1xuICAgIGxldCBwYWdlID0gYXdhaXQgYnJvd3Nlci5uZXdQYWdlKCk7XG5cbiAgICBsZXQgbWV0YTogTWV0YSA9IHsgZGF0YTogW10gfTtcbiAgICBwYWdlLm9uKCdjb25zb2xlJywgbXNnID0+IHtcbiAgICAgIGxldCBqc29uID0gbXNnLnRleHQoKTtcbiAgICAgIGlmICghanNvbi5pbmNsdWRlcygnREVCVUc6JykpIHtcbiAgICAgICAgbWV0YS5kYXRhLnB1c2goanNvbik7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBsZXQgbmF2aWdhdGlvbk9wdGlvbnMgPSBlbnYubmF2aWdhdGlvbiEub3B0aW9ucyA/IGVudi5uYXZpZ2F0aW9uIS5vcHRpb25zIDoge307XG5cbiAgICBmb3IgKGxldCB1cmwgb2YgZW52Lm5hdmlnYXRpb24hLnVybHMpIHtcbiAgICAgIHNwaW5uZXIuc3RhcnQoYFZpc2l0aW5nICR7dXJsfSAuLi5gKTtcbiAgICAgIGF3YWl0IHBhZ2UuZ290byh1cmwsIG5hdmlnYXRpb25PcHRpb25zKTtcbiAgICAgIHNwaW5uZXIgPSBzcGlubmVyLnN1Y2NlZWQoYFZpc2l0ZWQgJHt1cmx9YCk7XG4gICAgfVxuXG4gICAgYXdhaXQgYnJvd3Nlci5jbG9zZSgpO1xuXG4gICAgYXdhaXQgZW52LmNvbW1pdCgpO1xuICAgIGF3YWl0IGVudi5jaGVja291dEJyYW5jaCh0aGlzLndvcmtpbmdCcmFuY2gpO1xuICAgIGF3YWl0IGVudi5kZWxldGVTY3JhdGNoQnJhbmNoKCk7XG5cbiAgICByZXR1cm4gbWV0YTtcbiAgfVxuXG4gIGFwcGx5KG1ldGE6IE1ldGEpOiB2b2lkIHtcbiAgICBmcy53cml0ZUZpbGVTeW5jKCdkeWZhY3Rvci1tZXRhZGF0YS5qc29uJywgSlNPTi5zdHJpbmdpZnkobWV0YSkpO1xuICB9XG59XG5cbmV4cG9ydCBjbGFzcyBIYXZvY01vZGUgZXh0ZW5kcyBEYXRhTW9kZSB7XG4gIGFwcGx5KG1ldGE6IE1ldGEpOiB2b2lkIHtcbiAgICB0aGlzLnBsdWdpbi5hcHBseU1ldGEobWV0YSk7XG4gIH1cbn1cbiJdfQ==