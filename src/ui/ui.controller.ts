import { Controller, Get, Res, Param, Req } from '@nestjs/common';
import { Response, Request } from 'express';
import { join } from 'path';

@Controller('ui')
export class UiController {
  
  @Get()
  serveRoot(@Res() res: Response) {
    return res.sendFile(join(process.cwd(), 'public', 'index.html'));
  }

  @Get('admin')
  serveAdmin(@Res() res: Response) {
    return res.sendFile(join(process.cwd(), 'public', 'admin', 'index.html'));
  }

  @Get('admin/*')
  serveAdminAssets(@Res() res: Response, @Param('0') path: string) {
    return res.sendFile(join(process.cwd(), 'public', 'admin', path));
  }

  @Get('auth/login.html')
  serveLogin(@Res() res: Response) {
    return res.sendFile(join(process.cwd(), 'public', 'auth', 'login.html'));
  }

  @Get('auth/register.html')
  serveRegister(@Res() res: Response) {
    return res.sendFile(join(process.cwd(), 'public', 'auth', 'register.html'));
  }

  @Get('auth/*')
  serveAuthAssets(@Res() res: Response, @Param('0') path: string) {
    return res.sendFile(join(process.cwd(), 'public', 'auth', path));
  }

  @Get('dashboard')
  serveDashboard(@Res() res: Response) {
    return res.sendFile(join(process.cwd(), 'public', 'dashboard', 'index.html'));
  }

  @Get('dashboard/*')
  serveDashboardAssets(@Res() res: Response, @Param('0') path: string) {
    return res.sendFile(join(process.cwd(), 'public', 'dashboard', path));
  }

  @Get('images/*')
  serveImages(@Res() res: Response, @Req() req: any) {
    let imagePath = req.params.path || req.params[0];
    // Handle case where path is an array
    if (Array.isArray(imagePath)) {
      imagePath = imagePath.join('/');
    }
    if (!imagePath) {
      return res.status(404).send('Image not found');
    }
    try {
      const fullPath = join(process.cwd(), 'public', 'images', imagePath);
      return res.sendFile(fullPath);
    } catch (error) {
      return res.status(404).send('Image not found');
    }
  }

  @Get('js/*')
  serveJavaScript(@Res() res: Response, @Req() req: any) {
    let jsPath = req.params.path || req.params[0];
    // Handle case where path is an array
    if (Array.isArray(jsPath)) {
      jsPath = jsPath.join('/');
    }
    if (!jsPath) {
      return res.status(404).send('File not found');
    }
    try {
      const fullPath = join(process.cwd(), 'public', 'js', jsPath);
      return res.sendFile(fullPath);
    } catch (error) {
      return res.status(404).send('File not found');
    }
  }

  @Get('css/*')
  serveCSS(@Res() res: Response, @Req() req: any) {
    let cssPath = req.params.path || req.params[0];
    // Handle case where path is an array
    if (Array.isArray(cssPath)) {
      cssPath = cssPath.join('/');
    }
    if (!cssPath) {
      return res.status(404).send('File not found');
    }
    try {
      const fullPath = join(process.cwd(), 'public', 'css', cssPath);
      return res.sendFile(fullPath);
    } catch (error) {
      return res.status(404).send('File not found');
    }
  }

  @Get('*')
  serveStaticFiles(@Res() res: Response, @Param('0') path: string) {
    if (!path) {
      return res.status(404).send('File not found');
    }
    try {
      const fullPath = join(process.cwd(), 'public', path);
      return res.sendFile(fullPath);
    } catch (error) {
      return res.status(404).send('File not found');
    }
  }
}
