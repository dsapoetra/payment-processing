import { Controller, Get, Redirect } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Redirect('/ui/', 302)
  getHello(): void {
    // Redirect root path to UI
  }

  @Get('admin')
  @Redirect('/ui/admin/', 302)
  redirectAdmin(): void {
    // Redirect /admin to /ui/admin/
  }
}
