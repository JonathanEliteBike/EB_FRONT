import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-inventario-it',
  standalone: true, 
  imports: [RouterModule,RouterLink ],
  templateUrl: './inventario-it.component.html',
  styleUrl: './inventario-it.component.css'
})
export class InventarioItComponent {

}