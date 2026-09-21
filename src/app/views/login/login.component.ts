import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { TopBarComponent } from '../../components/top-bar/top-bar.component';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { jwtDecode } from 'jwt-decode';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterModule, TopBarComponent, FormsModule, CommonModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email: string = '';
  password: string = '';
  loading: boolean = false;
  error: string = '';
  verPassword = false;

  constructor(private authService: AuthService, private router: Router) { }

  iniciarSesion() {
    this.loading = true;
    this.error = '';

    const credentials = {
      usuario: this.email,
      contrasena: this.password
    };

   this.authService.login(credentials).subscribe({
      next: (response) => {
        localStorage.setItem('token', response.token);

        const decodedToken: any = jwtDecode(response.token);
        const rol = decodedToken.rol || decodedToken.rol_id;

        if (rol === 1) {
          this.router.navigate(['/home']);
        } else if (rol === 2 || rol === 3) {
          this.router.navigate(['/usuarios/dashboard']);
        } else if (rol === 99) {
          this.router.navigate(['/importaciones']);
        } else {
          this.router.navigate(['/login']);
        }
      },
      error: (err) => {
        this.error = err.error?.error || 'Error en el servidor';
        this.loading = false;
      },
      complete: () => {
        this.loading = false;
      }
    });
  }
}