import { Component, EventEmitter, Input, Output, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VoyageService } from '../../services/voyage.service';
import { AudioRecorderService } from '../../services/audio-recorder.service';

@Component({
  selector: 'app-avis-form',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './avis-form.component.html',
  styleUrls: ['./avis-form.component.css']
})
export class AvisFormComponent implements OnInit {
  @Input() reservationId!: number;
  @Input() avisExistant: any = null;

  @Output() fermer = new EventEmitter<void>();
  @Output() avisSoumis = new EventEmitter<void>();

  private voyageService = inject(VoyageService);
  private audioRecorderService = inject(AudioRecorderService);
  private cdr = inject(ChangeDetectorRef); // 👉 CORRECTION : Indispensable pour débloquer l'interface

  note: number = 5;
  commentaire: string = '';
  
  isLoadingText: boolean = false;
  isRecording: boolean = false;
  isLoadingAudio: boolean = false;
  erreur: string = '';

  ngOnInit() {
    if (this.avisExistant) {
      this.note = this.avisExistant.note;
      this.commentaire = this.avisExistant.commentaire || '';
    }
  }

  setNote(valeur: number) {
    this.note = valeur;
  }

  soumettreTexte() {
    this.isLoadingText = true;
    this.erreur = '';

    const requete = this.avisExistant
      ? this.voyageService.modifierAvis(this.avisExistant.id, this.note, this.commentaire)
      : this.voyageService.creerAvisTexte(this.reservationId, this.note, this.commentaire);

    requete.subscribe({
      next: () => {
        this.isLoadingText = false;
        this.avisSoumis.emit(); 
      },
      error: (err) => {
        this.isLoadingText = false;
        this.gererErreurIA(err); // 👉 NOUVEAU : Centralisation des messages
        this.cdr.detectChanges(); 
      }
    });
  }

  async toggleEnregistrement() {
    this.erreur = '';

    if (this.isRecording) {
      this.isRecording = false;
      this.isLoadingAudio = true;
      this.cdr.detectChanges();

      try {
        const audioBlob = await this.audioRecorderService.stopRecording();
        const idPourModif = this.avisExistant ? this.avisExistant.id : undefined;
        
        this.voyageService.soumettreAvisVocal(this.reservationId, audioBlob, this.note, idPourModif).subscribe({
          next: () => {
            this.isLoadingAudio = false;
            this.avisSoumis.emit();
          },
          error: (err) => {
            this.isLoadingAudio = false;
            this.gererErreurIA(err); // 👉 NOUVEAU
            this.cdr.detectChanges(); // 👉 CORRECTION : Débloque le spinner
          }
        });
      } catch (err) {
        this.isLoadingAudio = false;
        this.erreur = "Erreur lors de l'arrêt du micro.";
        this.cdr.detectChanges();
      }
    } else {
      try {
        await this.audioRecorderService.startRecording();
        this.isRecording = true;
        this.cdr.detectChanges();
      } catch (err) {
        this.erreur = "L'accès au microphone a été refusé.";
        this.cdr.detectChanges();
      }
    }
  }

  // 👉 NOUVEAU : Traduction humaine des codes d'erreur
  private gererErreurIA(err: any) {
    if (err.status === 429) {
      this.erreur = "L'IA est actuellement saturée (trop de requêtes). Veuillez patienter quelques instants.";
    } else if (err.status === 503) {
      this.erreur = "Le service IA est temporairement indisponible.";
    } else if (err.status === 405) {
      this.erreur = "Action refusée par le serveur (Erreur de configuration 405).";
    } else {
      this.erreur = "Une erreur est survenue lors du traitement : " + (err.error?.detail || err.message);
    }
  }
}