import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HomeBarComponent } from '../../components/home-bar/home-bar.component';

@Component({
  selector: 'app-acceso-restringido',
  standalone: true,
  imports: [RouterLink, HomeBarComponent],
  templateUrl: './acceso-restringido.component.html',
  styleUrl: './acceso-restringido.component.css'
})
export class AccesoRestringidoComponent {}
