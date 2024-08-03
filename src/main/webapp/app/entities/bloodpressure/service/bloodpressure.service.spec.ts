import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';

import { IBloodpressure } from '../bloodpressure.model';
import { sampleWithRequiredData, sampleWithNewData, sampleWithPartialData, sampleWithFullData } from '../bloodpressure.test-samples';

import { BloodpressureService } from './bloodpressure.service';

const requireRestSample: IBloodpressure = {
  ...sampleWithRequiredData,
};

describe('Bloodpressure Service', () => {
  let service: BloodpressureService;
  let httpMock: HttpTestingController;
  let expectedResult: IBloodpressure | IBloodpressure[] | boolean | null;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    expectedResult = null;
    service = TestBed.inject(BloodpressureService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  describe('Service methods', () => {
    it('should find an element', () => {
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.find(123).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should create a Bloodpressure', () => {
      const bloodpressure = { ...sampleWithNewData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.create(bloodpressure).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'POST' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should update a Bloodpressure', () => {
      const bloodpressure = { ...sampleWithRequiredData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.update(bloodpressure).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'PUT' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should partial update a Bloodpressure', () => {
      const patchObject = { ...sampleWithPartialData };
      const returnedFromService = { ...requireRestSample };
      const expected = { ...sampleWithRequiredData };

      service.partialUpdate(patchObject).subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'PATCH' });
      req.flush(returnedFromService);
      expect(expectedResult).toMatchObject(expected);
    });

    it('should return a list of Bloodpressure', () => {
      const returnedFromService = { ...requireRestSample };

      const expected = { ...sampleWithRequiredData };

      service.query().subscribe(resp => (expectedResult = resp.body));

      const req = httpMock.expectOne({ method: 'GET' });
      req.flush([returnedFromService]);
      httpMock.verify();
      expect(expectedResult).toMatchObject([expected]);
    });

    it('should delete a Bloodpressure', () => {
      const expected = true;

      service.delete(123).subscribe(resp => (expectedResult = resp.ok));

      const req = httpMock.expectOne({ method: 'DELETE' });
      req.flush({ status: 200 });
      expect(expectedResult).toBe(expected);
    });

    describe('addBloodpressureToCollectionIfMissing', () => {
      it('should add a Bloodpressure to an empty array', () => {
        const bloodpressure: IBloodpressure = sampleWithRequiredData;
        expectedResult = service.addBloodpressureToCollectionIfMissing([], bloodpressure);
        expect(expectedResult).toHaveLength(1);
        expect(expectedResult).toContain(bloodpressure);
      });

      it('should not add a Bloodpressure to an array that contains it', () => {
        const bloodpressure: IBloodpressure = sampleWithRequiredData;
        const bloodpressureCollection: IBloodpressure[] = [
          {
            ...bloodpressure,
          },
          sampleWithPartialData,
        ];
        expectedResult = service.addBloodpressureToCollectionIfMissing(bloodpressureCollection, bloodpressure);
        expect(expectedResult).toHaveLength(2);
      });

      it("should add a Bloodpressure to an array that doesn't contain it", () => {
        const bloodpressure: IBloodpressure = sampleWithRequiredData;
        const bloodpressureCollection: IBloodpressure[] = [sampleWithPartialData];
        expectedResult = service.addBloodpressureToCollectionIfMissing(bloodpressureCollection, bloodpressure);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(bloodpressure);
      });

      it('should add only unique Bloodpressure to an array', () => {
        const bloodpressureArray: IBloodpressure[] = [sampleWithRequiredData, sampleWithPartialData, sampleWithFullData];
        const bloodpressureCollection: IBloodpressure[] = [sampleWithRequiredData];
        expectedResult = service.addBloodpressureToCollectionIfMissing(bloodpressureCollection, ...bloodpressureArray);
        expect(expectedResult).toHaveLength(3);
      });

      it('should accept varargs', () => {
        const bloodpressure: IBloodpressure = sampleWithRequiredData;
        const bloodpressure2: IBloodpressure = sampleWithPartialData;
        expectedResult = service.addBloodpressureToCollectionIfMissing([], bloodpressure, bloodpressure2);
        expect(expectedResult).toHaveLength(2);
        expect(expectedResult).toContain(bloodpressure);
        expect(expectedResult).toContain(bloodpressure2);
      });

      it('should accept null and undefined values', () => {
        const bloodpressure: IBloodpressure = sampleWithRequiredData;
        expectedResult = service.addBloodpressureToCollectionIfMissing([], null, bloodpressure, undefined);
        expect(expectedResult).toHaveLength(1);
        expect(expectedResult).toContain(bloodpressure);
      });

      it('should return initial array if no Bloodpressure is added', () => {
        const bloodpressureCollection: IBloodpressure[] = [sampleWithRequiredData];
        expectedResult = service.addBloodpressureToCollectionIfMissing(bloodpressureCollection, undefined, null);
        expect(expectedResult).toEqual(bloodpressureCollection);
      });
    });

    describe('compareBloodpressure', () => {
      it('Should return true if both entities are null', () => {
        const entity1 = null;
        const entity2 = null;

        const compareResult = service.compareBloodpressure(entity1, entity2);

        expect(compareResult).toEqual(true);
      });

      it('Should return false if one entity is null', () => {
        const entity1 = { id: 123 };
        const entity2 = null;

        const compareResult1 = service.compareBloodpressure(entity1, entity2);
        const compareResult2 = service.compareBloodpressure(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('Should return false if primaryKey differs', () => {
        const entity1 = { id: 123 };
        const entity2 = { id: 456 };

        const compareResult1 = service.compareBloodpressure(entity1, entity2);
        const compareResult2 = service.compareBloodpressure(entity2, entity1);

        expect(compareResult1).toEqual(false);
        expect(compareResult2).toEqual(false);
      });

      it('Should return false if primaryKey matches', () => {
        const entity1 = { id: 123 };
        const entity2 = { id: 123 };

        const compareResult1 = service.compareBloodpressure(entity1, entity2);
        const compareResult2 = service.compareBloodpressure(entity2, entity1);

        expect(compareResult1).toEqual(true);
        expect(compareResult2).toEqual(true);
      });
    });
  });

  afterEach(() => {
    httpMock.verify();
  });
});
