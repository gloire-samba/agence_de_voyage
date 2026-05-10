import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js'; 

import { ServeurService } from '../../services/serveur.service';
import { ReservationService } from '../../services/reservation.service';
import { environment } from '../../../environments/environment.development';

@Component({
  selector: 'app-paiement',
  standalone: true,
  imports: [CommonModule], 
  templateUrl: './paiement.component.html',
  styleUrls: ['./paiement.component.css']
})
export class PaiementComponent implements OnInit {
  reservationId!: number;
  prixTotal!: number;

  private http = inject(HttpClient);
  private serveurService = inject(ServeurService);
  private reservationService = inject(ReservationService);
  private cdr = inject(ChangeDetectorRef);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  isLoading = false;
  message = '';
  ticketRecu = false;

  private stripe: Stripe | null = null;
  private elements: StripeElements | null = null;

  async ngOnInit() {
    this.reservationId = Number(this.route.snapshot.paramMap.get('reservationId'));
    this.prixTotal = Number(this.route.snapshot.paramMap.get('prix'));
    
    this.stripe = await loadStripe('pk_test_51TSDQQ233VR20pvSSLzE8e6TDSvgE8UyawtC93zOX8P0rajCT4cfmgdgNUQzrNMw3IzhMTUrbJzdqXR5SxULS1iF00DNWsnDdi');
    this.demanderTicketPaiement();
  }

  private demanderTicketPaiement() {
    const backend = this.serveurService.getBackend();
    const url = backend === 'spring' 
      ? `${environment.urls[backend]}/paiement/create-intent`
      : `${environment.urls[backend]}/paiement/create-intent/`;

    this.http.post<{clientSecret: string}>(url, { prixTotal: this.prixTotal }).subscribe({
      next: (res) => {
        if (res && res.clientSecret && this.stripe) {
          
          this.elements = this.stripe.elements({
            clientSecret: res.clientSecret,
            locale: 'fr',
            appearance: { theme: 'stripe' }
          });

          const paymentElement = this.elements.create('payment', { layout: 'tabs' });
          
          this.ticketRecu = true;
          this.cdr.detectChanges(); 

          setTimeout(() => {
            paymentElement.mount('#payment-element-div');
          }, 0);

        } else {
          this.message = "Erreur : Ticket secret non reçu.";
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.message = "Échec de la communication avec l'API de paiement.";
        this.cdr.detectChanges();
      }
    });
  }

  async payer() {
    if (this.isLoading || !this.stripe || !this.elements) return;
    
    this.isLoading = true;
    this.message = "Traitement du paiement en cours...";
    this.cdr.detectChanges();

    const { error, paymentIntent } = await this.stripe.confirmPayment({
      elements: this.elements,
      redirect: 'if_required' 
    });

    if (error) {
      this.isLoading = false;
      this.message = "❌ Paiement refusé : " + error.message;
      this.cdr.detectChanges();
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      
      this.message = "✅ Paiement Stripe validé ! Mise à jour de votre billet...";
      this.cdr.detectChanges();

      // 👉 LA MAGIE EST ICI : On envoie le "paymentIntent.id" (le reçu Stripe) au backend !
      this.reservationService.confirmerPaiement(this.reservationId, paymentIntent.id).subscribe({
        next: () => {
          this.isLoading = false;
          this.message = "✅ Billet confirmé ! Bon voyage !";
          this.cdr.detectChanges();
          setTimeout(() => this.router.navigate(['/historique']), 2000);
        },
        error: (err) => {
          this.isLoading = false;
          this.message = "⚠️ Paiement accepté, mais erreur de confirmation côté serveur.";
          this.cdr.detectChanges();
        }
      });
      
    } else {
      this.isLoading = false;
      this.message = "Erreur inattendue.";
      this.cdr.detectChanges();
    }
  }
}